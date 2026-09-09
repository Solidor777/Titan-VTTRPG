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

### 2. Player HUD effects panel renders no effect row for a seeded effect

- **What:** Three e2e specs assert the Player HUD effects panel shows a seeded effect's row header
  and time out waiting for `[data-testid="player-hud-effects-panel"] .row .row-header .name`:
  `embedded-context-check-parity.spec.js:374` and `:441`, and
  `embedded-context-effects.spec.js:316`. The panel renders, but contains no row for the effect.
- **Severity:** Unknown — either the HUD fails to list an effect it should, or the specs' seeding
  path no longer produces a HUD-visible effect. Not yet distinguished.
- **Found:** 2026-09-08, during the e2e GPU/throttling work. Reproduces identically with the GPU
  enabled and with `TITAN_E2E_GPU=0`, and in isolation as well as in a full-suite shard, so it is
  neither a GPU-rendering nor a test-ordering effect.
- **Fix direction:** Determine first whether the effect reaches the HUD's source collection at all
  (the HUD resolves against the first *selected* token) before touching the panel's rendering.

### 3. Theme `auto` mode does not follow the Foundry core color scheme

- **What:** `theme.spec.js:56` (`auto follows the Foundry core color scheme`) fails with
  `titanWait timed out after 5000ms waiting for: theme for scheme light applied` — switching the
  Foundry core color scheme to light does not apply the corresponding TITAN theme.
- **Severity:** Functional; the `auto` theme setting does not track the core scheme.
- **Found:** 2026-09-08, during the e2e GPU/throttling work. Reproduces with the GPU enabled and
  with `TITAN_E2E_GPU=0`, and in isolation, so it is unrelated to the rendering backend.
- **Fix direction:** Check the core color-scheme change hook the theme applier subscribes to; the
  wait is for the applied theme, so either the hook does not fire or the applier ignores it.
