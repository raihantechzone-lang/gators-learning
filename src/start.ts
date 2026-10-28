import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { getRequest, setResponseHeader } from '@tanstack/react-start/server';

const securityHeaders = createMiddleware().server(async ({ next }) => {
  const request = getRequest();
  const path = new URL(request.url).pathname;
  if (/^\/(?:\.env|\.git|src\/|supabase\/|drizzle\/)/.test(path) && import.meta.env.PROD) {
    return new Response('Not found', { status: 404 });
  }
  setResponseHeader('X-Content-Type-Options', 'nosniff');
  setResponseHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  setResponseHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  setResponseHeader('Content-Security-Policy', "object-src 'none'; base-uri 'self'; form-action 'self' https://accounts.google.com; frame-ancestors 'self' https://*.lovable.app https://*.lovableproject.com https://lovable.dev https://*.lovable.dev");
  if (new URL(request.url).protocol === 'https:') setResponseHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  if (/^\/(admin|dashboard|teacher)(\/|$)/.test(path)) setResponseHeader('Cache-Control', 'private, no-store');
  return next();
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, securityHeaders, csrfMiddleware],
}));
// Triggering redeploy at Tue Aug 18 17:31:26 UTC 2026
