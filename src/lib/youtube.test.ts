import { describe, expect, test } from "bun:test";
import { parseYouTubeId } from "./youtube";

describe("YouTube lesson links", () => {
  test("accepts a full watch URL with preceding query parameters", () => {
    expect(parseYouTubeId("https://www.youtube.com/watch?feature=shared&v=EI3kXGCGQYk")).toBe("EI3kXGCGQYk");
  });
  test("accepts short, shorts, live and embed links plus raw IDs", () => {
    for (const url of ["https://youtu.be/EI3kXGCGQYk?si=abc", "https://youtube.com/shorts/EI3kXGCGQYk", "https://youtube.com/live/EI3kXGCGQYk", "https://youtube-nocookie.com/embed/EI3kXGCGQYk", "EI3kXGCGQYk"]) {
      expect(parseYouTubeId(url)).toBe("EI3kXGCGQYk");
    }
  });
  test("rejects non-YouTube and invalid lesson links", () => {
    expect(parseYouTubeId("https://example.com/watch?v=EI3kXGCGQYk")).toBeNull();
    expect(parseYouTubeId("https://youtu.be/invalid")).toBeNull();
    expect(parseYouTubeId(null)).toBeNull();
  });
});