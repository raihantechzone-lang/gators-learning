import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resultSheetKey, readResultSheets } from './result-sheets';
describe('Shared PDF mark sheets', () => {
  it('uses one shared PDF for all students of the same course', () => {
    const value = JSON.stringify([{ id: 'exam', title: 'Final', url: 'https://example.com/all-results.pdf' }]);
    assert.deepEqual(readResultSheets(value), [{ id: 'exam', title: 'Final', url: 'https://example.com/all-results.pdf' }]);
    assert.equal(resultSheetKey('course-A'), 'exam_mark_sheets:course-A');
    assert.notEqual(resultSheetKey('course-A'), resultSheetKey('course-B'));
  });
  it('rejects executable links and malformed data', () => {
    assert.deepEqual(readResultSheets('[{"id":"x","title":"x","url":"javascript:alert(1)"}]'), []);
    assert.deepEqual(readResultSheets('not json'), []);
  });
});