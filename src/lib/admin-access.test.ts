import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { verifyAdminAccess, type AdminAuthClient } from './admin-access';
import { normalizeAdminNumber, parseAdminNumber, certificateLink } from './admin-input';

function client(user: { id: string } | null, roles: { role: string }[], roleError: unknown = null): AdminAuthClient {
  const query = { eq: () => query, then: (resolve: (value: unknown) => void) => resolve({ data: roles, error: roleError }) };
  return { auth: { getUser: async () => ({ data: { user }, error: null }) }, from: () => ({ select: () => query }) };
}
describe('Verified admin access', () => {
  it('rejects an absent Auth user even with admin rows', async () => assert.equal(await verifyAdminAccess(client(null, [{ role: 'admin' }])), false));
  it('rejects signed-in students', async () => assert.equal(await verifyAdminAccess(client({ id: 'student' }, [{ role: 'student' }])), false));
  it('accepts a verified Auth user with an admin role', async () => assert.equal(await verifyAdminAccess(client({ id: 'admin' }, [{ role: 'admin' }])), true));
  it('fails closed when role lookup is blocked', async () => assert.rejects(verifyAdminAccess(client({ id: 'admin' }, [], new Error('blocked')))));
});
describe('Admin form values', () => {
  it('accepts Bengali prices and enrollment counts', () => { assert.equal(normalizeAdminNumber('১২৩'), '123'); assert.equal(parseAdminNumber('৫০০০', 'Price'), 5000); assert.equal(parseAdminNumber('১২৩', 'Count', true), 123); });
  it('rejects invalid or negative values instead of saving zero', () => { assert.throws(() => parseAdminNumber('১২x', 'Price')); assert.throws(() => parseAdminNumber('-1', 'Count', true)); assert.throws(() => parseAdminNumber('1.5', 'Count', true)); });
  it('rejects executable certificate links', () => { assert.throws(() => certificateLink('javascript:alert(1)')); assert.equal(certificateLink(' https://example.com/certificate.pdf '), 'https://example.com/certificate.pdf'); });
});