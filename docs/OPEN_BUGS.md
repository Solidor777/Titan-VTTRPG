# Open Bugs

Deferred/known bugs. Todos (planned work) live in `docs/TODO.md`; this file is bugs only.

### 2. The release workflow targets a module layout this system does not have

- **What:** `.github/workflows/main.yml` ("Release Creation", the repo's only workflow) is the
  unmodified League-of-Foundry-Developers *module* template. It substitutes version/manifest URLs
  into `module.json` and zips `module.json assets/ dist/ lang/ packs/ LICENSE AUTHORS`. This project
  is a **system**: it has `system.json` and no `module.json`, and no `assets/`, `LICENSE` (it is
  `LICENSE-MIT`), or `AUTHORS`. The substitution step would fail on the missing file, and the zip
  would omit the manifest a client needs to install the system.
- **Severity:** Latent. The workflow triggers only `on: release: published`, and the repository has
  **0 workflow runs in its history**, so this has never fired. Publishing a release would surface it.
- **Found:** 2026-09-08, while checking for CI after a push. Verified: `gh workflow list` shows the
  single workflow, `actions/runs` reports `total_count: 0`, and the referenced paths are absent.
- **Fix direction:** Retarget the workflow at `system.json` and the paths that exist, or delete it if
  releases are cut by hand. Note there is also no push/PR workflow, so nothing gates a push today —
  decide whether lint/unit should run in CI as part of the same change.
