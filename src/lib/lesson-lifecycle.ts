export interface LessonForm {
  title: string;
  youtube_url: string;
  thumbnail_url: string;
  live_url: string;
  pdf_url: string;
  exam_link: string;
  exam_enabled: boolean;
  is_free: boolean;
}

export function lessonUpdate(form: LessonForm, previous?: { live_url?: string | null; live_expires_at?: string | null }, now = Date.now()) {
  const recording = form.youtube_url.trim();
  const live = recording ? "" : form.live_url.trim();
  return {
    title: form.title.trim(),
    youtube_url: recording || null,
    thumbnail_url: form.thumbnail_url.trim() || null,
    pdf_url: form.pdf_url.trim() || null,
    exam_link: form.exam_link.trim() || null,
    exam_enabled: form.exam_enabled,
    is_free: form.is_free,
    live_url: live || null,
    live_expires_at: !live ? null : live === previous?.live_url
      ? previous.live_expires_at ?? null
      : new Date(now + 24 * 60 * 60 * 1000).toISOString(),
  };
}