# GitHub and Vercel workflow

Configured on 15 October 2026 for [YoussefMohamed108/pc-exchange-egypt](https://github.com/YoussefMohamed108/pc-exchange-egypt) and the existing Vercel project `pc-exchange-egypt`. The owner explicitly chose public source visibility to retain the free plans. Credentials, local databases and private artifacts remain excluded from Git; both pre-existing commits were checked before changing visibility. Public visibility is not an open-source license.

## Pull requests and previews

Create a feature branch and a pull request targeting `main`. Vercel builds preview branches and posts a preview link on the PR. The GitHub `Quality checks` workflow runs on PRs and on `main`; feature branches do not need duplicate push runs.

Previews are isolated from the PC's live database. Only the preview and local-email labels are configured in Vercel's Preview environment. Catalogs are honestly empty and account actions are unavailable until a separate development backend is configured. The 3D navigation, layouts and sourced benchmark library remain reviewable. Production environment values are not copied to previews. An unset site origin falls back to the generated Vercel deployment hostname.

Vercel authentication protects generated preview URLs. External fork deployments require maintainer authorization. Approve external contributors' CI/preview runs only after examining their changes. Never place privileged backend or SMTP credentials in either frontend environment.

## Required merge conditions

The `main` protection rule requires:

- Successful `web` and `analysis` checks from the GitHub Actions app, with the branch up to date.
- One approval from another authorized reviewer. The most recent push must be approved by someone other than its pusher, and new changes dismiss stale approvals.
- Resolved review conversations.
- The same requirements for administrators; force pushes and branch deletion are disabled.

GitHub does not allow authors to approve their own PR. Add at least one trusted collaborator with review permission before merging owner-authored PRs. Do not disable protection or use another account to fabricate approval.

## Production releases

Merging an eligible PR into `main` triggers a production build. Vercel's `GitHub web tests` and `GitHub Python tests` deployment checks read the matching commit's `web` and `analysis` jobs, wait up to 20 minutes and block production domain assignment until passing. Production still uses the existing PC-hosted Supabase backend and its production-only public connection variables.

Apply required database migrations on the PC before merging dependent frontend code. Keep migrations compatible with the currently running version. Restart/tunnel recovery rebuilds the already deployed production source and does not publish working-tree edits.

The owner can inspect settings at [GitHub branch protection](https://github.com/YoussefMohamed108/pc-exchange-egypt/settings/branches), [Vercel Git settings](https://vercel.com/youssefmohamed108s-projects/pc-exchange-egypt/settings/git) and [Vercel deployment checks](https://vercel.com/youssefmohamed108s-projects/pc-exchange-egypt/settings/deployment-checks). Keep the check names synchronized if workflow jobs are renamed. Rerun failed checks after addressing their cause; do not force-promote an unreviewed or failing release.

## References

- [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Vercel GitHub integration](https://vercel.com/docs/git/vercel-for-github)
- [Vercel deployment checks](https://vercel.com/docs/deployment-checks)
