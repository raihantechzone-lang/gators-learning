import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { teacherLoginEmail, teacherNameSchema, teacherPasswordSchema, requireTeacherAdmin } from './teacher-login';
describe('Admin-issued teacher credentials', () => {
  it('maps the admin name to the same login without collecting an email', async () => {
    assert.equal(await teacherLoginEmail(' Raihan   Tech '), await teacherLoginEmail('raihan tech'));
    assert.match(await teacherLoginEmail('রায়হান'), /^[a-f0-9]{64}@teachers\.gators\.invalid$/);
    assert.notEqual(await teacherLoginEmail('Teacher One'), await teacherLoginEmail('Teacher Two'));
  });
  it('does not normalize or trim a password', () => {
    assert.equal(teacherPasswordSchema.parse(' Secret 123 '), ' Secret 123 ');
    assert.equal(teacherNameSchema.parse(' Raihan '), 'raihan');
  });
  function clientWithRoles(roles: { role: string }[], user: { id: string } | null = { id: 'verified-admin' }) {
    const query = { select: () => query, eq: (column: string, value: string) => {
      if (column === 'user_id') assert.equal(value, 'verified-admin');
      return column === 'role' ? Promise.resolve({ data: roles, error: null }) : query;
    } };
    return { auth: { getUser: async () => ({ data: { user }, error: null }) }, from: (table: string) => { assert.equal(table, 'user_roles'); return query; } } as unknown as Parameters<typeof requireTeacherAdmin>[0];
  }
  it('allows a verified admin role without relying on the legacy is_admin function', async () => {
    await assert.doesNotReject(() => requireTeacherAdmin(clientWithRoles([{ role: 'admin' }])));
  });
  it('rejects students from teacher account management', async () => {
    await assert.rejects(() => requireTeacherAdmin(clientWithRoles([{ role: 'student' }])), /Admin access required/);
  });
  it('rejects an expired admin session', async () => {
    await assert.rejects(() => requireTeacherAdmin(clientWithRoles([], null)), /session has expired/);
  });
  it('rejects a forged browser admin flag', async () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => '1' } });
    try { await assert.rejects(() => requireTeacherAdmin(clientWithRoles([], null)), /session has expired/); }
    finally { if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else Reflect.deleteProperty(globalThis, 'localStorage'); }
  });
});