export interface LessonProgressRecord {
  lesson_id: string;
  course_id: string;
  progress_percent: number;
  last_position_seconds: number;
  duration_seconds: number;
  completed: boolean;
}

export const progressStorageKey = (userId: string) => `gl_lesson_progress_${userId}`;

export function courseProgress(lessonIds: string[], records: LessonProgressRecord[]) {
  if (!lessonIds.length) return 0;
  const total = lessonIds.reduce((sum, id) => {
    const matches = records.filter(row => row.lesson_id === id);
    return sum + Math.max(0, ...matches.map(row => row.completed ? 100 : Math.min(100, Math.max(0, Number(row.progress_percent) || 0))));
  }, 0);
  return Math.round(total / lessonIds.length);
}

export function hasCourseAccess(enrollment: { status?: string; payment_status?: string | null }) {
  if (enrollment.payment_status === "verified") return true;
  return enrollment.status === "active" && enrollment.payment_status == null;
}

export function readLocalProgress(userId: string): LessonProgressRecord[] {
  try {
    const records: unknown = JSON.parse(localStorage.getItem(progressStorageKey(userId)) || "[]");
    return Array.isArray(records) ? records.filter(row => row && typeof row.lesson_id === "string" && typeof row.course_id === "string") : [];
  } catch { return []; }
}
export const lessonReviewTag = (lessonId: string) => `[lesson:${lessonId}] `;

export function mergeProgress(records: LessonProgressRecord[], row: LessonProgressRecord): LessonProgressRecord[] {
  const old = records.find(r => r.lesson_id === row.lesson_id);
  const merged = {
    ...old, ...row,
    progress_percent: Math.max(Number(old?.progress_percent) || 0, Math.min(100, row.progress_percent)),
    completed: row.completed || (!!old?.completed && row.progress_percent >= 0 && row.completed !== false),
  };
  return [...records.filter(r => r.lesson_id !== row.lesson_id), merged];
}

export function saveLocalProgress(userId: string, row: LessonProgressRecord) {
  const records = mergeProgress(readLocalProgress(userId), row);
  try { localStorage.setItem(progressStorageKey(userId), JSON.stringify(records)); } catch { /* storage full */ }
  window.dispatchEvent(new Event("gl-progress"));
  return records;
}
