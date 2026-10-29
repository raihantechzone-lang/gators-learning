import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProfilePhoto, saveProfilePhoto } from './profile-photo';

describe('Profile photo persistence', () => {
  it('uses the uploaded photo instead of an older avatar', () => {
    assert.equal(normalizeProfilePhoto({ photo_url: 'https://example.com/new.jpg', avatar_url: 'https://example.com/old.jpg' }).photo_url, 'https://example.com/new.jpg');
  });
  it('displays an existing avatar when photo_url is empty', () => {
    assert.equal(normalizeProfilePhoto({ photo_url: null, avatar_url: 'https://example.com/avatar.jpg' }).photo_url, 'https://example.com/avatar.jpg');
  });
  function fixture(data: unknown, error: unknown = null) {
    const calls: unknown[] = [];
    const query = {
      update: (value: unknown) => { calls.push(value); return query; },
      eq: (column: string, id: string) => { calls.push([column, id]); return query; },
      select: () => query,
      single: async () => ({ data, error }),
    };
    return { client: { from: () => query } as unknown as Parameters<typeof saveProfilePhoto>[0], calls };
  }
  it('returns the saved owner profile for immediate shared display', async () => {
    const saved = { id: 'student-a', full_name: 'Student', photo_url: 'https://example.com/new.jpg' };
    const { client, calls } = fixture(saved);
    assert.deepEqual(await saveProfilePhoto(client, 'student-a', saved.photo_url), saved);
    assert.deepEqual(calls, [{ photo_url: saved.photo_url }, ['id', 'student-a']]);
  });
  it('does not report success when no profile was updated', async () => {
    await assert.rejects(saveProfilePhoto(fixture(null).client, 'student-a', 'https://example.com/new.jpg'));
  });
  it('propagates a rejected profile write', async () => {
    await assert.rejects(saveProfilePhoto(fixture(null, new Error('write denied')).client, 'student-a', 'https://example.com/new.jpg'), /write denied/);
  });
});