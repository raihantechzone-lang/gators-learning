import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

export const teacherNameSchema = z.string().trim().min(2).max(80).transform(value => value.normalize('NFC').toLowerCase().replace(/\s+/g, ' '));
export const teacherPasswordSchema = z.string().min(8).max(128);
export async function teacherLoginEmail(name: string) {
  const normalized = teacherNameSchema.parse(name);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  return `${Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('')}@teachers.gators.invalid`;
}

// Use an isolated Auth client: creating a teacher must never replace the admin session.
export async function requireTeacherAdmin(client = supabase) {
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) throw new Error('Your admin session has expired. Sign in again.');
  const { data: roles, error } = await client.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin');
  if (error) throw new Error('Unable to verify admin permissions. Please try again.');
  if (!roles?.some(role => role.role === 'admin')) throw new Error('Admin access required.');
}

export async function createTeacherAccount(form: { display_name: string; password: string; photo_url: string; title: string; bio: string }) {
  await requireTeacherAdmin();
  const loginName = teacherNameSchema.parse(form.display_name);
  const email = await teacherLoginEmail(loginName);
  const password = teacherPasswordSchema.parse(form.password);
  // Reuse the external client's public configuration without accessing protected properties.
  const { default: clientSource } = await import('@/integrations/supabase/client.ts?raw');
  const url = clientSource.match(/const SUPABASE_URL = ['"]([^'"]+)['"]/)?.[1];
  const key = clientSource.match(/const SUPABASE_PUBLISHABLE_KEY = ['"]([^'"]+)['"]/)?.[1];
  if (!url || !key) throw new Error('Teacher account service is not configured.');
  const isolated = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
      headers.set('apikey', key);
      return fetch(input, { ...init, headers });
    } },
  });
  try {
    // This admin-only lookup also confirms the updated setup SQL is installed before signup.
    const { data: exists, error: setupError } = await (supabase as any).rpc('teacher_login_exists', { login_name_input: loginName });
    if (setupError) throw new Error('Teacher account permissions could not be verified. The connected database needs the teacher permissions update.');
    if (exists) throw new Error('This teacher name is already in use. Choose a different name.');
    let { data, error } = await isolated.auth.signUp({ email, password, options: { data: { full_name: form.display_name.trim() } } });
    // Recover an orphaned signup using the original password; never expose or reset it.
    if (error || !data.session) {
      const retry = await isolated.auth.signInWithPassword({ email, password });
      if (!retry.error && retry.data.session) { data = retry.data; error = null; }
    }
    if (error) throw error;
    if (!data.session || !data.user) throw new Error('Teacher account needs confirmation. Disable email confirmation on your connected account service before creating teachers.');
    const { error: bindError } = await (supabase as any).rpc('register_teacher_account', {
      account_id: data.user.id, login_name_input: loginName, teacher_name: form.display_name.trim(),
      teacher_photo: form.photo_url || null, teacher_title: form.title || null, teacher_bio: form.bio || null,
    });
    if (bindError) throw new Error(`Account created but teacher assignment failed: ${bindError.message}. Do not create it again; retry using the same name and password.`);
  } finally { await isolated.auth.signOut({ scope: 'local' }); }
}