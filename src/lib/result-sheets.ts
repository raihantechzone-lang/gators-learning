export interface ResultSheet { id: string; title: string; url: string }
export const resultSheetKey = (courseId: string) => `exam_mark_sheets:${courseId}`;
export function readResultSheets(value: string | null | undefined): ResultSheet[] {
  try {
    const data: unknown = JSON.parse(value || '[]');
    if (!Array.isArray(data)) return [];
    return data.filter((row): row is ResultSheet => typeof row?.id === 'string' && typeof row?.title === 'string' && typeof row?.url === 'string' && /^https?:\/\//.test(row.url));
  } catch { return []; }
}