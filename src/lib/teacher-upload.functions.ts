import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const getTeacherUploadAuth = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { courseId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(input.courseId)) throw new Error('Invalid course');
    return input;
  })
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const admin = await db.rpc('is_admin');
    const assigned = await db.rpc('teaches_course', { target_course: data.courseId });
    if (admin.data !== true && assigned.data !== true) throw new Error('You cannot upload to this course.');
    const privateKey = process.env['IMAGEKIT_PRIVATE_KEY'];
    if (!privateKey) throw new Error('Uploads are unavailable.');
    const token = crypto.randomUUID();
    const expire = Math.floor(Date.now() / 1000) + 600;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(privateKey), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const bytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(token + expire));
    return { token, expire, signature: Array.from(new Uint8Array(bytes)).map(b => b.toString(16).padStart(2, '0')).join('') };
  });