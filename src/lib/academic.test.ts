import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { attendanceSummary, marksByCourse, performanceAdvice } from "./academic";

describe("mark sheets", () => {
  it("keeps a mark sheet inside its own course only", () => {
    const marks = [
      { course_id: "A", exam_name: "Mid", profile_id: "u", score: 40, max_score: 50 },
      { course_id: "B", exam_name: "Mid", profile_id: "u", score: 10, max_score: 50 },
    ];
    const out = marksByCourse(marks, ["A"]);
    assert.equal(out.get("A")?.get("Mid")?.score, 40);
    assert.equal(out.has("B"), false);
  });
});

describe("attendance", () => {
  const now = new Date("2026-10-27T12:00:00");
  const classes = [
    { id: "1", course_id: "A", title: "c1", created_at: "2026-10-20T10:00:00", live_url: "https://meet" },
    { id: "2", course_id: "A", title: "c2", created_at: "2026-10-25T10:00:00", live_url: null },
    { id: "3", course_id: "A", title: "future", created_at: "2026-10-30T10:00:00" },
  ];
  it("counts missed classes and missed live classes, ignoring future classes", () => {
    const s = attendanceSummary(classes, [{ profile_id: "u", course_id: "A", lesson_id: "2", attended_on: "2026-10-25" }], now);
    assert.equal(s.total, 2);
    assert.equal(s.present, 1);
    assert.equal(s.missed, 1);
    assert.equal(s.missedLive, 1);
    assert.equal(s.percent, 50);
  });
  it("rates low attendance and marks as needing improvement", () => {
    assert.equal(performanceAdvice(40, 30).level, "bad");
    assert.equal(performanceAdvice(95, 90).level, "good");
  });
});
