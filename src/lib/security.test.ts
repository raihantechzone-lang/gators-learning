import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { requireUploadAccess } from './upload-access';
import { escapeHtml, safeWebUrl, loadVisibleLessons } from './public-experience.js';

function client(role: string, assigned = false, signedIn = true) {
  return {
    auth: { getUser: async () => ({ data: { user: signedIn ? { id: 'u' } : null }, error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ eq: async () => ({ data: [{ role }], error: null }) }) }) }),
    rpc: async () => ({ data: assigned, error: null }),
  };
}
describe('Upload authorization', () => {
  it('rejects signed-out uploads', async () => { await assert.rejects(requireUploadAccess(client('admin', false, false))); });
  it('rejects students', async () => { await assert.rejects(requireUploadAccess(client('student'))); });
  it('allows verified administrators', async () => { await assert.doesNotReject(requireUploadAccess(client('admin'))); });
  it('allows assigned teachers only for their course', async () => {
    await assert.doesNotReject(requireUploadAccess(client('student', true), 'course'));
    await assert.rejects(requireUploadAccess(client('student', false), 'other'));
    await assert.rejects(requireUploadAccess(client('student', true)));
  });
});
describe('Untrusted inputs', () => {
  it('escapes markup rather than executing it', () => { assert.equal(escapeHtml('<img onerror="alert(1)">'), '&lt;img onerror=&quot;alert(1)&quot;&gt;'); });
  it('rejects script and data links', () => {
    assert.equal(safeWebUrl('javascript:alert(1)'), '');
    assert.equal(safeWebUrl('data:text/html,<script>alert(1)</script>'), '');
    assert.equal(safeWebUrl('https://example.com/notes.pdf'), 'https://example.com/notes.pdf');
  });
  it('uses the permission-filtered lesson read', async () => {
    const calls: unknown[] = [];
    const data = [{ id: 'l', title: 'Lesson', youtube_url: null }];
    const db = { rpc: async (...args: unknown[]) => { calls.push(args); return { data, error: null }; } };
    assert.deepEqual((await loadVisibleLessons(db, 'course')).data, data);
    assert.deepEqual(calls, [['visible_course_lessons', { target_course: 'course' }]]);
  });
});