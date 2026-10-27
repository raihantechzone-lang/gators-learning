import { expect, test } from "bun:test";
import postgres from "postgres";

// Run against a configured database without creating accounts or modifying rows.
test.skipIf(!process.env.SUPABASE_DB_URL)("authenticated policy checks execute without granting anonymous access or admin status", async () => {
  const connection = process.env.SUPABASE_DB_URL;
  if (!connection) return;
  const sql = postgres(connection, { max: 1, prepare: false });
  try {
    await sql.begin(async (tx) => {
      const [permissions] = await tx`
        SELECT
          has_function_privilege('authenticated', 'public.is_admin()', 'EXECUTE') AS admin_execute,
          has_function_privilege('authenticated', 'public.has_role(uuid,public.app_role)', 'EXECUTE') AS role_execute,
          has_function_privilege('anon', 'public.is_admin()', 'EXECUTE') AS anon_admin_execute,
          has_function_privilege('anon', 'public.has_role(uuid,public.app_role)', 'EXECUTE') AS anon_role_execute
      `;
      expect(permissions).toEqual({ admin_execute: true, role_execute: true, anon_admin_execute: false, anon_role_execute: false });

      const userId = crypto.randomUUID();
      await tx`SELECT set_config('request.jwt.claim.sub', ${userId}, true)`;
      await tx`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: "authenticated" })}, true)`;
      await tx`SET LOCAL ROLE authenticated`;
      const [checks] = await tx`SELECT public.is_admin() AS admin, public.has_role(auth.uid(), 'admin'::public.app_role) AS role_admin`;
      expect(checks).toEqual({ admin: false, role_admin: false });

      for (const table of ["profiles", "enrollments", "course_contents", "exam_results", "reviews", "app_ads", "site_settings", "user_roles", "enrollment_requests", "courses"]) {
        // Exercise each affected SELECT policy without returning personal data.
        await tx`SELECT EXISTS (SELECT 1 FROM ${tx("public", table)} LIMIT 1) AS readable`;
      }
    });
  } finally {
    await sql.end();
  }
});