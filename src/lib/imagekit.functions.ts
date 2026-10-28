import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { requireUploadAccess } from './upload-access';
import { z } from 'zod';

/**
 * ImageKit browser uploads must be signed server-side.
 * Returns { token, expire, signature } for the upload API.
 */
export const getImageKitAuth = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({folder:z.string().max(80)}))
  .handler(async ({ context, data }) => {
  await requireUploadAccess(context.supabase, undefined, ['/courses','/lessons','/notes','/videos'].includes(data.folder));
  const privateKey = process.env["IMAGEKIT_PRIVATE_KEY"];
  if (!privateKey) throw new Error("IMAGEKIT_PRIVATE_KEY is not configured");

  const token = crypto.randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 60;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(privateKey),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(token + expire));
  const signature = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return { token, expire, signature };
});
