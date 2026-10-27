import { useEffect, useState } from "react";

export function ArticleLesson({ html }: { html: string | null | undefined }) {
  const [clean, setClean] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!html) return;
    import("dompurify").then(({ default: DOMPurify }) => {
      if (!alive) return;
      setClean(
        DOMPurify.sanitize(html, {
          FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input"],
          FORBID_ATTR: ["style"],
        }),
      );
    });
    return () => {
      alive = false;
    };
  }, [html]);

  if (!html) return <p className="text-sm text-ink-muted">No article content yet.</p>;
  if (clean === null) return <p className="text-sm text-ink-muted">Loading article…</p>;
  return (
    <div
      className="prose prose-sm sm:prose-base max-w-none text-ink [&_a]:text-brand [&_h1]:text-ink [&_h2]:text-ink [&_h3]:text-ink [&_strong]:text-ink"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
