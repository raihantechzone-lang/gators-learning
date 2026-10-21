import { describe, it as test } from "node:test";
import assert from "node:assert/strict";
import { parseYouTubeId } from "./youtube";

describe("YouTube lesson links", () => {
  test("accepts a full watch URL with preceding query parameters", () => {
    assert.equal(parseYouTubeId("https://www.youtube.com/watch?feature=shared&v=EI3kXGCGQYk"), "EI3kXGCGQYk");
  });
  test("accepts short, shorts, live and embed links plus raw IDs", () => {
    for (const url of ["https://youtu.be/EI3kXGCGQYk?si=abc", "https://youtube.com/shorts/EI3kXGCGQYk", "https://youtube.com/live/EI3kXGCGQYk", "https://youtube-nocookie.com/embed/EI3kXGCGQYk", "EI3kXGCGQYk"]) {
      assert.equal(parseYouTubeId(url), "EI3kXGCGQYk");
    }
  });
  test("rejects non-YouTube and invalid lesson links", () => {
    assert.equal(parseYouTubeId("https://example.com/watch?v=EI3kXGCGQYk"), null);
    assert.equal(parseYouTubeId("https://youtu.be/invalid"), null);
    assert.equal(parseYouTubeId(null), null);
  });
});