import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { courseProgress, hasCourseAccess, progressStorageKey } from "./student-progress";

describe("Student dashboard rules", () => {
  it("counts unwatched lessons as zero in real course progress", () => {
    assert.equal(courseProgress(["a", "b"], [{ lesson_id: "a", course_id: "c", progress_percent: 60, last_position_seconds: 60, duration_seconds: 100, completed: false }]), 30);
  });
  it("does not double count duplicated or unrelated progress", () => {
    const row = { lesson_id: "a", course_id: "c", progress_percent: 100, last_position_seconds: 100, duration_seconds: 100, completed: true };
    assert.equal(courseProgress(["a", "b"], [row, row, { ...row, lesson_id: "other" }]), 50);
  });
  it("keeps unapproved payments locked", () => {
    assert.equal(hasCourseAccess({ status: "active", payment_status: "pending" }), false);
    assert.equal(hasCourseAccess({ status: "active", payment_status: "verified" }), true);
  });
  it("keeps browser progress separate for each student", () => {
    assert.notEqual(progressStorageKey("student-a"), progressStorageKey("student-b"));
  });
});