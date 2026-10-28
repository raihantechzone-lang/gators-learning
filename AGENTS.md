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
- Progress uses owner-scoped lesson_progress with a labeled per-user browser fallback; external SQL is delivered separately, never applied through unrelated Cloud tools.
- All signup/login paths use the shared student-roll helper, injected into full-document HTML from its raw source; preserve numeric assigned rolls and derive new 9-digit numeric rolls from the full user UUID, because the external roll_number column is integer.
- Shared public-experience helpers normalize email identically in HTML/React account forms without altering passwords and optimize ImageKit advertisement delivery; inject their raw source into full-document pages to keep those paths consistent.
- Public review reads must use only supported profile columns; homepage reviews and ads refresh on focus and periodically as a fallback when external realtime is unavailable.
- Payment approval updates only payment_status, never the external backend's constrained enrollment status; access and approved-payment reads share verified-payment semantics, with legacy active/null-payment access retained.

- Course-page reviews are lesson-scoped via a `[lesson:<id>] ` comment prefix (external reviews table has no lesson column); the homepage shows only reviews with null course_id.
- Course-page and dashboard progress use the shared owner-scoped progress-sync helper with serialized cloud writes and a timestamped browser cache; cloud loads happen before capturing resume position so fresh devices resume correctly.
- Lesson lifecycle writes use the shared lessonUpdate helper; React and full-document pages share isLessonLive from the raw-injected public-experience helper to keep recording/expiry visibility consistent.
- Enrollment page marketing sections (subtitle, highlights, details, instructor, benefits, FAQs) come from optional text columns on courses, edited in admin Courses; empty fields hide their section so no demo copy appears.
- Teacher profiles are admin-managed in teachers and many-to-many course_teachers; assignment changes use an admin-authorized atomic SQL RPC, and content editing reuses the curriculum builder with database-enforced assigned-course RLS. Supply external permission updates as chat attachments, not admin-page setup links, because Cloud migrations cannot reach this backend.
- Teacher/moderator credentials use separate normalized-name Auth aliases, not stored passwords; isolated signup preserves admin sessions and admin-only RPCs validate identities before binding roles. Never write reserved schemas.
- Teacher account management requires verified Auth and protected admin roles; teacher_is_admin remains admin-only.
- FAQ parsing and Bangladesh WhatsApp number normalization live in the raw-injected public-experience helper so HTML and React use identical rules.
- Teacher video uploads use an authenticated, assigned-course checked signature function and save video_file_url through the shared lesson lifecycle; native HTML and React playback both support those recordings.
- Shared exam PDF lists use course-keyed JSON entries in the existing settings table, not per-student exam marks, so this external-backend feature needs no new schema.
- Normal account forms resolve teacher aliases through raw-injected public-experience helpers and verify the teacher row before opening the dashboard; legacy separate login and removed admin URLs redirect to their current destinations.
- Attendance controls expire using the shared live predicate and re-read the lesson before submitting, so stale pages cannot mark an expired or recorded class through the UI.
- Share complete CDN-hosted Bengali font faces through public/bengali-font.css across HTML documents and React; keep Unicode digit coverage and safe line boxes so Bengali numerals are not lost to font subsetting or clipping.
- Panel access requires revalidated Auth and protected roles; moderator page allowlists and additive external RLS exclude dashboard, teacher accounts, reviews, ads and role management.
- Admin input/confirmation dialogs render through body portals, not inside animated page containers or browser-native prompts, so embedded previews and scrolling pages remain usable.
- Admin numeric form values use a shared Bengali-digit normalizer and strict parsing before saving, so Bengali input is accepted without silently converting invalid values to zero.
- Public/student lesson reads use visible_course_lessons, which redacts resources without entitlement; external SQL is delivered separately and never applied to the unrelated Cloud database.
- Upload signing revalidates Auth and a protected admin role or assigned course and consumes an atomic external database quota; missing quota configuration fails closed, and no browser flag or legacy email fallback authorizes uploads.
- Refund approval uses an admin-only atomic RPC and shared access checks reject revoked states, avoiding partial approvals and constrained enrollment-status changes.
- Shared raw-injected security helpers escape text and allow HTTPS resource URLs across HTML and React; response headers allow the Lovable preview but prohibit unrelated framing.
- management-rules centralizes pending/free grouping and actual-payment financial totals; free entitlement also needs the external lesson RPC.
- WhatsApp queues track opened links, not delivery; absence matching uses Bangladesh dates and stored live expiry windows, not lesson creation dates.
