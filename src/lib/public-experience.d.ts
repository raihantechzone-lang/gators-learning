export function normalizeStudentEmail(value: unknown): string;
export function adDisplayImage(value: string): string;
export function isLessonLive(lesson: { live_url?: string | null; live_expires_at?: string | null; youtube_url?: string | null; video_file_url?: string | null } | null | undefined, now?: number): boolean;