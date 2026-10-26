/** Keep email input consistent across HTML and React account forms. Never alter passwords. */
export function normalizeStudentEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

/** Recorded lessons never expose their old live session; live links expire after one day. */
export function isLessonLive(lesson, now = Date.now()) {
  return Boolean(lesson?.live_url && !String(lesson.youtube_url || lesson.video_file_url || "").trim()
    && lesson.live_expires_at && Date.parse(lesson.live_expires_at) > now);
}

/** Resize only ImageKit assets; leave other storage providers' URLs intact. */
export function adDisplayImage(value) {
  try {
    const url = new URL(value);
    if (url.hostname === "ik.imagekit.io") {
      url.searchParams.set("tr", "w-840,q-80,f-auto");
      return url.href;
    }
  } catch { /* Return the original URL so normal image error handling applies. */ }
  return value;
}