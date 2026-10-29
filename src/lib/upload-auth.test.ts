import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { uploadAuthHeaders } from './upload-auth';

function auth(token: string | null, error: unknown = null) {
  return { getSession: async () => ({ data: { session: token ? { access_token: token } : null }, error }) } as Parameters<typeof uploadAuthHeaders>[0];
}

describe('Upload signature session headers', () => {
  it('sends the current signed-in bearer to thumbnail signing', async () => {
    const headers = await uploadAuthHeaders(auth('test-session-token'));
    assert.equal(headers.get('authorization'), 'Bearer test-session-token');
  });
  it('reads the session again for every upload instead of reusing an old token', async () => {
    let token = 'first-session';
    const session = { getSession: async () => ({ data: { session: { access_token: token } }, error: null }) } as Parameters<typeof uploadAuthHeaders>[0];
    assert.equal((await uploadAuthHeaders(session)).get('authorization'), 'Bearer first-session');
    token = 'refreshed-session';
    assert.equal((await uploadAuthHeaders(session)).get('authorization'), 'Bearer refreshed-session');
  });
  it('rejects signed-out upload requests before contacting the signer', async () => {
    await assert.rejects(uploadAuthHeaders(auth(null)), /আবার লগইন/);
  });
  it('does not use a session when the session lookup fails', async () => {
    await assert.rejects(uploadAuthHeaders(auth('stale-session', new Error('expired'))), /আবার লগইন/);
  });
});