import assert from "node:assert/strict";
import { test } from "node:test";
import postgres from "postgres";

// Run against a configured database without creating accounts or modifying rows.
test("policy checks allow authenticated execution without granting anonymous access or admin status", { skip: !process.env.SUPABASE_DB_URL }, async () => {
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
      assert.deepEqual(permissions, { admin_execute: true, role_execute: true, anon_admin_execute: false, anon_role_execute: false });

      const userId = crypto.randomUUID();
      await tx`SELECT set_config('request.jwt.claim.sub', ${userId}, true)`;
      await tx`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: "authenticated" })}, true)`;
      const [checks] = await tx`SELECT public.is_admin() AS admin, public.has_role(${userId}::uuid, 'admin'::public.app_role) AS role_admin`;
      assert.deepEqual(checks, { admin: false, role_admin: false });
    });
  } finally {
    await sql.end();
  }
});