import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { teacherLoginEmail, teacherNameSchema, teacherPasswordSchema } from './teacher-login';
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
});