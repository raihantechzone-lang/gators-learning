<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- The homepage and enrollment are full-document HTML server responses; React links to those pages must use `reloadDocument` so navigation runs their HTML scripts.
- Keep `/details/$courseId` as a permanent redirect to enrollment, rather than a second course page, to preserve published course links.
- Enrollment page shows the lesson thumbnail first and replaces it in place with the native YouTube iframe on click; the optional player API must never block playback.
- Student progress uses owner-scoped lesson_progress when available, with an explicitly labeled per-user browser fallback shared by the HTML player and React dashboard; the connected external backend cannot be migrated through the project's Cloud tools.
- All signup/login paths use the shared student-roll helper, injected into full-document HTML from its raw source; preserve numeric assigned rolls and derive new 9-digit numeric rolls from the full user UUID, because the external roll_number column is integer.
- Shared public-experience helpers normalize email identically in HTML/React account forms without altering passwords and optimize ImageKit advertisement delivery; inject their raw source into full-document pages to keep those paths consistent.
- Public review reads must use only supported profile columns; homepage reviews and ads refresh on focus and periodically as a fallback when external realtime is unavailable.
- Payment approval updates only payment_status, never the external backend's constrained enrollment status; access and approved-payment reads share verified-payment semantics, with legacy active/null-payment access retained.

- Course-page reviews are lesson-scoped via a `[lesson:<id>] ` comment prefix (external reviews table has no lesson column); the homepage shows only reviews with null course_id.
- Course-page and dashboard progress use the shared owner-scoped progress-sync helper with serialized cloud writes and a timestamped browser cache; cloud loads happen before capturing resume position so fresh devices resume correctly.
