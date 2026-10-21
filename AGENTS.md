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
- Render native YouTube iframes before loading the optional player API; API availability must never block playback, and it only supports resume/progress.
