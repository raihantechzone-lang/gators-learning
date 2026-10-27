export function assignedCourseIds(rows, teacherId) {
  return [...new Set(rows.filter(row => row.teacher_id === teacherId).map(row => row.course_id))];
}