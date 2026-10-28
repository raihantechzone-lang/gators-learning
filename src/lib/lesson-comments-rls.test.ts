import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const course = '99009c2f-e99f-487b-bd3e-47555c960333';
const lesson = '33333333-3333-4333-8333-333333333333';
const comment = `[lesson:${lesson}] আমার প্রশ্ন`;
const migration = readFileSync(new URL('./lesson-comments-rls.sql', import.meta.url), 'utf8');

async function database() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA public, auth TO authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
    CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE TABLE public.course_contents(id uuid, course_id uuid);
    INSERT INTO public.course_contents VALUES ('${lesson}', '${course}');
    CREATE TABLE public.reviews(profile_id uuid NOT NULL, course_id uuid, rating integer,
      comment text, is_approved boolean DEFAULT false);
    GRANT SELECT, INSERT ON public.reviews TO authenticated;
    ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
    CREATE POLICY submit_review ON public.reviews FOR INSERT TO authenticated
      WITH CHECK (profile_id = auth.uid() AND coalesce(is_approved, false) = false);
    CREATE POLICY own_review ON public.reviews FOR SELECT TO authenticated USING(profile_id = auth.uid());
  `);
  await db.exec(migration);
  await db.exec(`SET ROLE authenticated; SET app.user_id = '${owner}';`);
  return db;
}

test('lesson comment is immediately approved despite the old false-only INSERT policy', async () => {
  const db = await database();
  try {
    await db.query('INSERT INTO reviews VALUES ($1,$2,5,$3,false)', [owner, course, comment]);
    await db.exec(`SET app.user_id = '${other}';`);
    const result = await db.query('SELECT is_approved, comment FROM reviews');
    assert.deepEqual(result.rows, [{ is_approved: true, comment }]);
  } finally { await db.close(); }
});

test('homepage review stays pending', async () => {
  const db = await database();
  try {
    await db.query('INSERT INTO reviews VALUES ($1,NULL,5,$2,false)', [owner, 'হোমপেজ রিভিউ']);
    assert.deepEqual((await db.query('SELECT is_approved FROM reviews')).rows, [{ is_approved: false }]);
  } finally { await db.close(); }
});

test('student cannot approve their homepage review', async () => {
  const db = await database();
  try {
    await assert.rejects(db.query('INSERT INTO reviews VALUES ($1,NULL,5,$2,true)', [owner, 'হোমপেজ রিভিউ']), /administrator/);
  } finally { await db.close(); }
});

test('student cannot insert a comment as another student', async () => {
  const db = await database();
  try {
    await assert.rejects(db.query('INSERT INTO reviews VALUES ($1,$2,5,$3,false)', [other, course, comment]), /owner/);
  } finally { await db.close(); }
});

test('lesson tag must belong to the specified course', async () => {
  const db = await database();
  try {
    await assert.rejects(db.query('INSERT INTO reviews VALUES ($1,$2,5,$3,false)', [owner, other, comment]), /Invalid lesson/);
  } finally { await db.close(); }
});