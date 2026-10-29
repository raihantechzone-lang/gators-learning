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

- Homepage/enrollment use full-document HTML: use reloadDocument links and keep SEO tags in both HTML and route head because React does not render those responses.
- Keep `/details/$courseId` as a permanent redirect to enrollment, rather than a second course page, to preserve published course links.
- React/HTML lessons share one Plyr adapter and its bound center/timeline controls, with thumbnail-first/native fallback; never duplicate YouTube instances or fake quality choices.
- Progress uses owner-scoped lesson_progress with labeled per-user browser fallback; deliver external SQL separately, never apply to Cloud.
- Signup/login share raw-injected student-roll: preserve assigned numeric rolls; derive new 9-digit rolls from the full UUID for the external integer column.
- Raw-injected public-experience helpers share email normalization, untouched passwords, ad optimization and a revalidated current-account signup guard across HTML/React.
- Public reviews use supported profile columns; homepage reviews/ads refresh on focus and periodically when external realtime is unavailable.
- Payment approval updates only payment_status, never the external backend's constrained enrollment status; access and approved-payment reads share verified-payment semantics, with legacy active/null-payment access retained.

- Course-page reviews are lesson-scoped via a `[lesson:<id>] ` comment prefix (external reviews table has no lesson column); a database trigger and compatible owner-scoped INSERT policy publish valid lesson comments immediately, while null-course homepage reviews retain administrator approval.
- Course-page and dashboard progress use the shared owner-scoped progress-sync helper with serialized cloud writes and a timestamped browser cache; cloud loads happen before capturing resume position so fresh devices resume correctly.
- Lesson lifecycle writes use the shared lessonUpdate helper; React and full-document pages share isLessonLive from the raw-injected public-experience helper to keep recording/expiry visibility consistent.
- Enrollment page marketing sections (subtitle, highlights, details, instructor, benefits, FAQs) come from optional text columns on courses, edited in admin Courses; empty fields hide their section so no demo copy appears.
- Teachers use admin-managed teachers/course_teachers, atomic admin assignment RPCs and assigned-course RLS; reuse the curriculum builder. Deliver external SQL as chat attachments, never apply it to Cloud or link it in admin pages.
- Teacher/moderator credentials use separate normalized-name Auth aliases, not stored passwords; isolated signup preserves admin sessions and admin-only RPCs validate identities before binding roles. Never write reserved schemas.
- Teacher account management requires verified Auth and protected admin roles; teacher_is_admin remains admin-only.
- FAQ parsing and Bangladesh WhatsApp number normalization live in the raw-injected public-experience helper so HTML and React use identical rules.
- Teacher video uploads use an authenticated, assigned-course checked signature function and save video_file_url through the shared lesson lifecycle; native HTML and React playback both support those recordings.
- Shared exam PDF lists use course-keyed JSON entries in the existing settings table, not per-student exam marks, so this external-backend feature needs no new schema.
- Normal account forms resolve teacher aliases through raw-injected public-experience helpers and verify the teacher row before opening the dashboard; legacy separate login and removed admin URLs redirect to their current destinations.
- Attendance controls expire using the shared live predicate and re-read the lesson before submitting, so stale pages cannot mark an expired or recorded class through the UI.
- Share complete CDN-hosted Bengali font faces through public/bengali-font.css across HTML documents and React; keep Unicode digit coverage and safe line boxes so Bengali numerals are not lost to font subsetting or clipping.
- Panel access requires revalidated Auth and protected roles; moderator page allowlists exclude dashboard, teacher accounts, reviews, ads, earnings and role management. Student visibility uses additive read-only external RLS, never an expanded admin helper, to preserve privilege boundaries.
- Admin input/confirmation dialogs render through body portals, not inside animated page containers or browser-native prompts, so embedded previews and scrolling pages remain usable.
- Admin numeric form values use a shared Bengali-digit normalizer and strict parsing before saving, so Bengali input is accepted without silently converting invalid values to zero.
- Public/student lesson reads use visible_course_lessons, which redacts resources without entitlement; external SQL is delivered separately and never applied to the unrelated Cloud database.
- Upload signing revalidates Auth and a protected admin role or assigned course and consumes an atomic external database quota; missing quota configuration fails closed, and no browser flag or legacy email fallback authorizes uploads.
- Refund RPC atomically revokes duplicate payments/certificates without changing enrollment status; shared checks reject revoked states and course reads discard stale account responses.
- Shared raw-injected security helpers escape text and allow HTTPS resource URLs across HTML and React; response headers allow the Lovable preview but prohibit unrelated framing.
- management-rules centralizes pending/free grouping and actual-payment financial totals; free entitlement also needs the external lesson RPC.
- WhatsApp queues track opened links, not delivery; absence matching uses Bangladesh dates and stored live expiry windows, not lesson creation dates.

- Photo uploads read back the owner row and update Auth state immediately; route invalidation cannot refresh it. Normalize avatar_url and discard stale requests.
- Sitemap derives static URLs from required route decisions and paginates the session-free external published catalogue; failures return 503, never partial XML; omit lastmod without page timestamps.
