import { useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { courseProgress, type LessonProgressRecord } from "@/lib/student-progress";

interface ContentLite {
  id: string;
  section_id?: string | null;
}
interface SectionLite {
  id: string;
  title: string;
}

export function CourseProgress({
  records,
  contents,
  sections,
}: {
  records: LessonProgressRecord[];
  contents: ContentLite[];
  sections: SectionLite[];
}) {
  const { user } = useAuth();
  const overallPct = useMemo(() => courseProgress(contents.map((c) => c.id), records), [contents, records]);
  const completedIds = useMemo(() => new Set(records.filter((r) => r.completed).map((r) => r.lesson_id)), [records]);

  const bySection = useMemo(() => {
    return sections.map((s) => {
      const items = contents.filter((c) => c.section_id === s.id);
      const done = items.filter((c) => completedIds.has(c.id)).length;
      return { section: s, total: items.length, done };
    });
  }, [sections, contents, completedIds]);

  if (!user) return null;

  return (
    <div className="mb-4 p-4 rounded-2xl bg-background border border-border shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold text-ink">Course progress</span>
        <span className="text-sm font-bold text-brand">{overallPct}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-muted mb-2">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${overallPct}%` }} />
      </div>
      {bySection.length > 0 && (
        <ul className="space-y-1.5 mt-2">
          {bySection.map(({ section, total, done }) => (
            <li key={section.id} className="flex items-center justify-between text-xs text-ink-muted">
              <span className="truncate">{section.title}</span>
              <span>
                {done}/{total}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
