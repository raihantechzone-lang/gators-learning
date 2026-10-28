import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { requireUploadAccess } from './upload-access';

export const getTeacherUploadAuth = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { courseId: string }) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.courseId)) throw new Error('Invalid course');
    return input;
  })
  .handler(async ({ data, context }) => {
    await requireUploadAccess(context.supabase, data.courseId);
    const privateKey = process.env['IMAGEKIT_PRIVATE_KEY'];
    if (!privateKey) throw new Error('Uploads are unavailable.');
    const token = crypto.randomUUID();
    const expire = Math.floor(Date.now() / 1000) + 60;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(privateKey), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const bytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(token + expire));
    return { token, expire, signature: Array.from(new Uint8Array(bytes)).map(b => b.toString(16).padStart(2, '0')).join('') };
  });