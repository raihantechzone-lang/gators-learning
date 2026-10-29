import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const student = '11111111-1111-4111-8111-111111111111';
const admin = '22222222-2222-4222-8222-222222222222';
const course = '99009c2f-e99f-487b-bd3e-47555c960333';
const request = '33333333-3333-4333-8333-333333333333';
const sql = readFileSync(new URL('./refund-access.sql', import.meta.url), 'utf8');

async function database() {
 const db = new PGlite();
 await db.exec(`
 CREATE ROLE anon; CREATE ROLE authenticated;
 CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
 $$ SELECT nullif(current_setting('app.user_id',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA auth,public TO anon,authenticated;
 GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;
 CREATE TABLE public.user_roles(user_id uuid,role text);
 INSERT INTO public.user_roles VALUES ('${admin}','admin');
 CREATE TABLE public.enrollments(profile_id uuid,course_id uuid,status text,
 payment_status text CHECK(payment_status IN ('verified','pending')),certificate_url text);
 CREATE TABLE public.refund_requests(id uuid,user_id uuid,course_id uuid,invoice_id uuid,status text,admin_note text,processed_at timestamptz);
 INSERT INTO public.enrollments VALUES
 ('${student}','${course}','active','verified','https://example.com/certificate'),
 ('${student}','${course}','bounced','verified',NULL);
 INSERT INTO public.refund_requests VALUES ('${request}','${student}','${course}',NULL,'pending',NULL,NULL);
 `);
 await db.exec(sql);
 return db;
}

test('refunded status overrides verified payment in the database', async () => {
 const db = await database();
 try {
  await db.exec(`UPDATE enrollments SET status=' REFUNDED '; SET app.user_id='${student}'; SET ROLE authenticated;`);
  assert.deepEqual((await db.query('SELECT course_access_allowed($1) AS allowed',[course])).rows,[{allowed:false}]);
 } finally { await db.close(); }
});
test('verified non-active and legacy active null payments retain access', async () => {
 const db = await database();
 try {
  await db.exec(`DELETE FROM enrollments WHERE status='active'; SET app.user_id='${student}';`);
  assert.deepEqual((await db.query('SELECT course_access_allowed($1) AS allowed',[course])).rows,[{allowed:true}]);
  await db.exec(`UPDATE enrollments SET status='active',payment_status=NULL;`);
  assert.deepEqual((await db.query('SELECT course_access_allowed($1) AS allowed',[course])).rows,[{allowed:true}]);
 } finally { await db.close(); }
});
test('students cannot approve their own refund', async () => {
 const db = await database();
 try {
  await db.exec(`SET app.user_id='${student}'; SET ROLE authenticated;`);
  await assert.rejects(db.query('SELECT approve_course_refund($1,$2)',[request,'']),/Administrator required/);
  await db.exec('RESET ROLE;');
  assert.deepEqual((await db.query('SELECT status FROM refund_requests')).rows,[{status:'pending'}]);
 } finally { await db.close(); }
});
test('admin approval revokes every duplicate payment and certificate atomically', async () => {
 const db = await database();
 try {
  await db.exec(`SET app.user_id='${admin}'; SET ROLE authenticated;`);
  await db.query('SELECT approve_course_refund($1,$2)',[request,'approved']);
  await db.exec(`SET app.user_id='${student}';`);
  assert.deepEqual((await db.query('SELECT course_access_allowed($1) AS allowed',[course])).rows,[{allowed:false}]);
  await db.exec('RESET ROLE;');
  assert.deepEqual((await db.query('SELECT payment_status,certificate_url FROM enrollments')).rows,
   [{payment_status:'pending',certificate_url:null},{payment_status:'pending',certificate_url:null}]);
  assert.deepEqual((await db.query('SELECT status FROM refund_requests')).rows,[{status:'approved'}]);
 } finally { await db.close(); }
});