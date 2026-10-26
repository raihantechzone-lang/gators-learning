import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface Note {
  id: string;
  content_id: string;
  timestamp_seconds: number;
  body: string;
  created_at: string;
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const localKey = (userId: string, courseId: string) => `gl-notes:${userId}:${courseId}`;
const readLocal = (userId: string, courseId: string): Note[] => {
  try { return JSON.parse(localStorage.getItem(localKey(userId, courseId)) || "[]"); } catch { return []; }
};
const writeLocal = (userId: string, courseId: string, notes: Note[]) =>
  localStorage.setItem(localKey(userId, courseId), JSON.stringify(notes));

export function LessonNotes({
  courseId,
  contentId,
  currentTime = 0,
  onSeek,
}: {
  courseId: string;
  contentId: string;
  currentTime?: number;
  onSeek?: (sec: number) => void;
}) {
  const { user } = useAuth();
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [body, setBody] = useState("");
  const [cloud, setCloud] = useState(true);

  const load = async () => {
    if (!user) return setAllNotes([]);
    const { data, error } = await (supabase as any)
      .from("lesson_notes")
      .select("id, content_id, timestamp_seconds, body, created_at")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .order("timestamp_seconds", { ascending: true });
    if (error) {
      setCloud(false);
      setAllNotes(readLocal(user.id, courseId));
    } else {
      setCloud(true);
      setAllNotes((data as Note[]) ?? []);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, courseId]);

  const lessonNotes = allNotes
    .filter((n) => n.content_id === contentId)
    .sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);

  const addNote = async () => {
    if (!user) return;
    const note: Note = {
      id: crypto.randomUUID(),
      content_id: contentId,
      timestamp_seconds: Math.floor(currentTime),
      body: body.trim() || `Saved at ${fmt(currentTime)}`,
      created_at: new Date().toISOString(),
    };
    if (cloud) {
      const { error } = await (supabase as any).from("lesson_notes").insert({
        user_id: user.id, course_id: courseId, content_id: contentId,
        timestamp_seconds: note.timestamp_seconds, body: note.body,
      });
      if (!error) { setBody(""); return load(); }
      setCloud(false);
    }
    const next = [...readLocal(user.id, courseId), note];
    writeLocal(user.id, courseId, next);
    setAllNotes(next);
    setBody("");
  };

  const removeNote = async (id: string) => {
    if (!user) return;
    if (cloud) {
      await (supabase as any).from("lesson_notes").delete().eq("id", id);
      return load();
    }
    const next = readLocal(user.id, courseId).filter((n) => n.id !== id);
    writeLocal(user.id, courseId, next);
    setAllNotes(next);
  };

  if (!user) return <p className="text-sm text-ink-muted">Log in to take notes.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`Note at ${fmt(currentTime)} (time saves automatically)`}
          className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm text-ink"
        />
        <button
          onClick={addNote}
          className="px-4 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-bold shrink-0"
        >
          Add note
        </button>
      </div>

      <h4 className="text-sm font-bold text-ink">My Notes</h4>
      <ul className="space-y-2">
        {lessonNotes.map((n) => (
          <li key={n.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-surface-alt border border-border">
            <div className="min-w-0">
              <button onClick={() => onSeek?.(n.timestamp_seconds)} className="text-xs font-bold text-brand mb-1">
                ▶ {fmt(n.timestamp_seconds)}
              </button>
              <p className="text-sm text-ink break-words">{n.body}</p>
            </div>
            <button onClick={() => removeNote(n.id)} className="text-ink-muted text-xs shrink-0" aria-label="Delete note">
              ✕
            </button>
          </li>
        ))}
        {lessonNotes.length === 0 && <p className="text-sm text-ink-muted">No notes yet.</p>}
      </ul>
    </div>
  );
}
