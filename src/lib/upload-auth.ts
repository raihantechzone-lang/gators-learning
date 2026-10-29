import type { SupabaseClient } from '@supabase/supabase-js';

/** Resolve the current session immediately before requesting an upload signature. */
export async function uploadAuthHeaders(auth: Pick<SupabaseClient['auth'], 'getSession'>): Promise<Headers> {
  const { data, error } = await auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error('আপলোড করতে আবার লগইন করুন।');
  return new Headers({ Authorization: `Bearer ${token}` });
}