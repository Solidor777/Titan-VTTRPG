# Open Bugs

Deferred/known bugs. Todos (planned work) live in `docs/TODO.md`; this file is bugs only.

### 1. Chat resource-mod tag gradients reference an undefined named palette

- **What:** The named brand palette `--titan-blue`, `--titan-green`, `--titan-yellow`,
  `--titan-maroon`, `--titan-orange`, and `--titan-cyan` is defined nowhere in `src/`. The three
  resource-mod tag gradient mixins in `src/styles/Mixins/SystemMixins.scss` (`fast-healing-tag`
  green→yellow, `persistent-damage-tag` maroon→orange, `resolve-regain-tag` blue→cyan), consumed by
  `ChatMessageResourceModTag.svelte`, build `--titan-tag-background` from these undefined tokens, so
  the gradient resolves to an invalid value and the tag falls back to its base background.
- **Severity:** Cosmetic; the tags still render with a flat fallback background, just not the
  intended gradient.
- **Found:** 2026-06-18, during the player-HUD styling bug-fix brainstorm. The HUD's own
  `--titan-cyan` accent was fixed in that batch via a themed `accent-color` token (CLOSED_BUGS #27);
  these chat-tag references were left for a dedicated fix.
- **Fix direction:** Map each gradient endpoint to an existing themed semantic token (e.g. stamina /
  wounds / resolve) or add the named palette to the theme contract.

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
