import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeProgress, reconcileProgress, courseProgress, hasCourseAccess, progressStorageKey } from "./student-progress";
import { paymentVerificationUpdate } from "./enrollment-payment";

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
  it("verifies payment without replacing the database-constrained enrollment status", () => {
    assert.deepEqual(paymentVerificationUpdate("verified"), { payment_status: "verified" });
    assert.deepEqual({ status: "bounced", ...paymentVerificationUpdate("verified") }, { status: "bounced", payment_status: "verified" });
  });
  it("unlocks a verified enrollment with the existing database status", () => {
    assert.equal(hasCourseAccess({ status: "bounced", payment_status: "verified" }), true);
    assert.equal(hasCourseAccess({ status: "bounced", payment_status: "pending" }), false);
  });
  it("keeps rejected or unrecognized payments locked", () => {
    assert.equal(hasCourseAccess({ status: "active", payment_status: "failed" }), false);
    assert.equal(hasCourseAccess({ status: "bounced", payment_status: "failed" }), false);
    assert.equal(hasCourseAccess({ status: "active", payment_status: "unknown" }), false);
  });
});
describe("mergeProgress", () => {
  const base = { lesson_id: "l1", course_id: "c1", last_position_seconds: 60, duration_seconds: 100, progress_percent: 60, completed: false };
  it("never lowers watched percentage", () => {
    assert.equal(mergeProgress([base], { ...base, progress_percent: 20 })[0].progress_percent, 60);
  });
  it("unmarking a completed lesson resets it", () => {
    const done = { ...base, progress_percent: 100, completed: true };
    assert.equal(mergeProgress([done], { ...base, progress_percent: 0, completed: false })[0].progress_percent, 0);
  });
  it("loads a saved playback position on a device with no browser history", () => {
    const saved = { ...base, last_position_seconds: 60, updated_at: "2026-10-26T16:00:00Z" };
    assert.equal(reconcileProgress([], [saved])[0].last_position_seconds, 60);
  });
  it("uses a newer cloud reset rather than stale completed browser progress", () => {
    const stale = { ...base, completed: true, progress_percent: 100, updated_at: "2026-10-26T15:00:00Z" };
    const remote = { ...base, progress_percent: 0, last_position_seconds: 0, updated_at: "2026-10-26T16:00:00Z" };
    assert.equal(courseProgress(["l1"], reconcileProgress([stale], [remote])), 0);
  });
});
