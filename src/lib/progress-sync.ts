import { supabase } from "@/integrations/supabase/client";
import { readLocalProgress, reconcileProgress, saveLocalProgress, progressStorageKey, type LessonProgressRecord } from "./student-progress";

export async function loadStudentProgress(userId: string, courseId?: string) {
  let query = supabase.from("lesson_progress").select("lesson_id, course_id, progress_percent, last_position_seconds, duration_seconds, completed, updated_at").eq("profile_id", userId);
  if (courseId) query = query.eq("course_id", courseId);
  const { data, error } = await query;
  const local = readLocalProgress(userId);
  if (error) throw new Error(error.message);
  const records = reconcileProgress(local, (data ?? []) as LessonProgressRecord[]);
  try { localStorage.setItem(progressStorageKey(userId), JSON.stringify(records)); } catch { /* cloud read still succeeds */ }
  return courseId ? records.filter(row => row.course_id === courseId) : records;
}

// Serialize writes per student/lesson so an older request cannot finish last.
const writes = new Map<string, Promise<void>>();
export function saveStudentProgress(userId: string, row: LessonProgressRecord) {
  const records = saveLocalProgress(userId, { ...row, updated_at: new Date().toISOString() });
  const record = records.find(item => item.lesson_id === row.lesson_id);
  if (!record) return Promise.resolve();
  const key = `${userId}:${row.lesson_id}`;
  const write = (writes.get(key) ?? Promise.resolve()).catch(() => {}).then(async () => {
    const { error } = await supabase.from("lesson_progress").upsert({ ...record, profile_id: userId }, { onConflict: "profile_id,lesson_id" });
    if (error) throw new Error(error.message);
  });
  writes.set(key, write);
  void write.finally(() => { if (writes.get(key) === write) writes.delete(key); }).catch(() => {});
  return write;
}