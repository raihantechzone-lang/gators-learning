import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { lessonUpdate } from "./lesson-lifecycle";
import { isLessonLive } from "./public-experience.js";

const now = Date.parse("2026-10-26T16:47:00Z");
const form = { title: "Live lesson", youtube_url: "", thumbnail_url: "https://example.org/thumb.jpg", live_url: "https://meet.google.com/abc", pdf_url: "", exam_link: "", exam_enabled: false, is_free: false };
describe("Live-first lesson lifecycle", () => {
  it("saves thumbnail and live link without a recording", () => {
    const row = lessonUpdate(form, undefined, now);
    assert.equal(row.youtube_url, null);
    assert.equal(row.thumbnail_url, form.thumbnail_url);
    assert.equal(isLessonLive(row, now), true);
  });
  it("expires a live link after exactly 24 hours", () => {
    const row = lessonUpdate(form, undefined, now);
    assert.equal(Date.parse(row.live_expires_at || "") - now, 86400000);
    assert.equal(isLessonLive(row, now + 86400000), false);
  });
  it("removes live link and expiry when recording is saved", () => {
    const row = lessonUpdate({ ...form, youtube_url: "https://youtu.be/abcdefghijk" }, undefined, now);
    assert.equal(row.live_url, null);
    assert.equal(row.live_expires_at, null);
  });
  it("hides live badge for existing recorded rows even with a future live expiry", () => {
    assert.equal(isLessonLive({ ...form, youtube_url: "https://youtu.be/abcdefghijk", live_expires_at: new Date(now + 86400000).toISOString() }, now), false);
  });
  it("allows paid lessons to become free", () => {
    assert.equal(lessonUpdate({ ...form, is_free: true }, undefined, now).is_free, true);
  });
  it("allows free lessons to become paid", () => {
    assert.equal(lessonUpdate({ ...form, is_free: false }, undefined, now).is_free, false);
  });
  it("preserves live expiry when editing other lesson information", () => {
    const previous = lessonUpdate(form, undefined, now);
    assert.equal(lessonUpdate({ ...form, title: "Updated", pdf_url: "notes.pdf", exam_link: "exam", exam_enabled: true }, previous, now + 3600000).live_expires_at, previous.live_expires_at);
  });
});