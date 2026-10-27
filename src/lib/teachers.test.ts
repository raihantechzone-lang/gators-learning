import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
// Test the same assignment filter used by the teacher dashboard.
import { assignedCourseIds } from './teacher-assignment.js';
describe('Teacher assignment', () => {
  it('has a blank course list until the admin assigns a course', () => {
    assert.deepEqual(assignedCourseIds([], 'teacher-a'), []);
    assert.deepEqual(assignedCourseIds([{ course_id: 'course-a', teacher_id: 'teacher-a' }], 'teacher-a'), ['course-a']);
  });
  it('shows only the courses assigned to that teacher', () => {
    assert.deepEqual(assignedCourseIds([{ course_id: 'course-a', teacher_id: 'teacher-a' }, { course_id: 'course-b', teacher_id: 'teacher-b' }], 'teacher-a'), ['course-a']);
  });
  it('allows multiple teachers to share a course', () => {
    const rows = [{ course_id: 'course-a', teacher_id: 'teacher-a' }, { course_id: 'course-a', teacher_id: 'teacher-b' }];
    assert.deepEqual(assignedCourseIds(rows, 'teacher-a'), ['course-a']);
    assert.deepEqual(assignedCourseIds(rows, 'teacher-b'), ['course-a']);
  });
});