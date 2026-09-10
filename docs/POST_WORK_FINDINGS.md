# Post-Work Findings

Living record of post-work review issues — gotchas, accepted limitations, and issues that deserve
attention. NOT a to-do list (deferred work goes to `docs/TODO.md`; bugs go to `docs/OPEN_BUGS.md`).

### Player HUD: the shell's `options` prop is a mount-time snapshot (2026-06-11)

`TitanPlayerHud.#mountActors` passes `playerHudOptions()` as a plain prop into `PlayerHudShell`;
elements and `buildActionMenuModel` read it non-reactively. It stays correct ONLY because every
settings write goes through `game.settings.set('titan', 'playerHudOptions', …)`, whose `onChange`
calls `refresh({ force: true })` and remounts the shell with a fresh snapshot. Any future path that
changes HUD options without `game.settings.set` (or that removes the `onChange`) leaves the mounted
HUD silently stale — no error surfaces. Flagged by the 2026-06-11 final branch review of
`feature/player-hud` as an accepted tradeoff matching the codebase's shell patterns.

### Foundry v14 core: CombatTracker render throws on non-viewed combat updates (2026-06-10)

Core's `CombatTracker._onRender` (`client/applications/sidebar/tabs/combat-tracker.mjs:185-188`)
does `data = renderData.find(d => d._id === this.viewed?.id)` and then `"turn" in data` — when an
`updateCombat` render arrives for a combat the tracker is NOT viewing (e.g. a combat bound to a
non-viewed scene), the `find` returns `undefined` and the render throws an uncaught
`Cannot use 'in' operator to search for 'turn' in undefined` on every round/turn update. Core bug,
not ours (we have no engine fork). Mitigation in our harness: `tests/shared/combat.js`
`seedCombatEncounter` sets `ui.combat.viewed` to the seeded combat (the posture of a GM actually
running the encounter) and `teardownCombatEncounter` clears it. The mitigation is PER-CLIENT: it
covers only the page that evaluated the seeder, so a multi-client spec that attaches page-error
assertions to a NON-seeding client must set `ui.combat.viewed` on that client too (today
`socket-sync.spec.js` does not assert page errors on the remote client, so the throw is unobserved
there); likewise any combat-driving e2e that bypasses the shared seeder. Surfaced by the
`effectsExpiredReport` e2e (TODO #13).

### Clone-then-update chat handlers: last-write-wins window (TODO #11 refactor, 2026-06-06)

The check chat-card handlers snapshot `system.toObject()` at click time and replace `results`
wholesale, so two rapid clicks on DIFFERENT targets within one update round-trip are
last-write-wins — the second click's payload silently reverts the first (the old live-mutation flow
accumulated same-client clicks instead). Accepted limitation: the window is one update round-trip,
the revert is visually self-evident and recoverable by re-clicking, and the new flow eliminates the
old flow's invalid-state (compounding double-click) and dirty-model-on-rejected-update hazards. If
it ever bites in play, the principled fix is a per-message serial queue around
`document.data.update(...)`.

## 2026-06-10 — Theming foundation visual pass

- Light-theme input identity diverged from the approved mockups during contrast tuning: Heritage
  Light inputs are now a soft lavender tint (`#eae6fc`/`#23184d`) rather than white, and Clean
  Neutral inputs a gray tint (`#eef1f5`), because white inputs were indistinguishable from white
  panels. Sanctioned by the spec's "guidelines, not hard rules" mandate; revisit during the
  character-sheet surface pass if the lavender reads too strong.
- The chat-card commit `a556e592` also carries the Task 6 primitives restyle (the mixin work was
  staged when the fix batch landed) — one-task-one-commit was not held there.
- `ui.chat.render()` on the `themeCoreMessages` onChange re-renders the chat log but NOT the chat
  notification pane's previously posted cards; they restyle on their next natural re-render.

## 2026-09-09 — E2E 1-second operation budget

- **Wait ceilings now equal the budget.** 34 explicit `timeout:` values across the e2e suite are set
  to 1000ms, so an operation exceeding the budget fails loudly instead of silently absorbing 15s.
  **Six are deliberately exempt** because they are inherently multi-second and would break at 1s:
  `fixtures.js:35` and `player-hud-layout.spec.js:139` (`game.ready`, world boot),
  `multiClient.js:48` (a second browser context finishing login), and `pack-conversion.spec.js`
  129/133/138 (login navigation plus the bulk pack conversion). Do not sweep these to 1s.
- **`titanWait`'s default timeout is 1000ms** (`tests/e2e/poll.js`), so the budget is the default at
  all 101 call sites that pass no explicit `timeout`. The single override is the exempt 30s world
  boot in `player-hud-layout.spec.js:139`. Verified across two consecutive full-suite runs: 497/497
  each, with zero `titanWait timed out after 1000ms` failures — no wait in the suite needs more than
  a second.
- **A world that is not launched looks like a code failure.** After the machine slept, Foundry served
  `/setup` while still answering `/join` with HTTP 200 and a `Critical Failure!` title. Every
  `beforeAll` then died at `page.selectOption('select[name="userid"]')`, producing a wall of `0ms`
  failures on the first test of each file with no error pointing at the cause. Check
  `curl -s localhost:30000/join | grep -oE '<title>[^<]*</title>'` before diagnosing a mass failure:
  the world name means live, `Critical Failure!` means no world is launched.
- **RESOLVED — the 1378ms click at `effect-chat-card.spec.js:150` was a test driving the wrong
  element.** Every TITAN chat card renders TWICE: once in the persistent `#chat` log and once as a
  transient toast in `#chat-notifications`. The two are siblings under `#ui-right` and the toast is
  FIRST in DOM order, so `.first()` on an unscoped `.message[data-message-id=...]` locator selected
  the toast. Measured toast lifecycle: no layout box at t=0, animating in to ~500ms, stable until
  ~4750ms, **detached from the DOM at ~5250ms**. A spec that posts a card, runs several assertions,
  then clicks was racing that ~4.25s window — clicking early paid the stability wait (the 1378ms),
  clicking late would hit a detached node. Fixed by scoping all 15 such locators to `#chat`.
- **The e2e client starts with the sidebar COLLAPSED**, which parks `#chat` at x=1920 in a 1920-wide
  viewport, entirely outside it. That is why the drift went unnoticed for so long: an off-screen card
  still satisfies text and `toBeVisible()` assertions, because its bounding box is non-empty — only a
  CLICK fails, with "element is outside of the viewport". `showChatLog()` (`world.js`) expands the
  sidebar and activates the chat tab; any spec interacting with a card in `#chat` must call it in
  `beforeAll`. Scoping plus the helper cut that group of specs from 2.7m to 40s.
- **`permissions-auto-open.spec.js:78` stays at the 1000ms budget — no exception.** A 5000ms
  relaxation was tried and reverted: measured on this hardware the pipeline is instant, with
  `nextTurn()` at 1-2ms and the turn-start heal landing in **52-61ms** across six samples. A >1s
  reading is therefore an 18x anomaly worth failing on, not latency to accommodate. It breached once
  in three full runs while the world was bloated (see the world-hygiene entry below) and has not
  recurred since the purge.

## 2026-09-10 — E2E world hygiene

- **`controlFixtureActorToken` leaked a scene per fallback.** It creates a scene when none is active
  and returns the id for cleanup, but only ONE of its ten callers ever deleted it. The world had
  accumulated **26 duplicate `E2E Player HUD Scene`** entries plus ~30 orphaned timestamped fixture
  actors (`E2E ApplyFH 1780636195030` and similar). The helper now reuses and re-activates a
  same-named fallback, so at most one exists per name; the existing duplicates were purged.
- **World bloat shows up as slow LOGIN, not slow tests.** At 31 scenes / 71 actors a full run
  reported `Navigate to "/join"` at 4062ms and `game.ready` at 1865ms. After the purge (5 scenes /
  41 actors) the same suite reported **`Slow operations (> 1000ms): none`** — the first run with
  nothing over budget, boot included. If boot times start climbing, check for accumulated fixtures
  before suspecting the harness.
- **Killed runs are the main source of cruft.** Stopping a full-suite run mid-flight skips every
  `afterAll`, so its fixtures survive. Prefer letting a run finish; sweep afterwards if not.

## 2026-09-10 — Backlog close-out campaign

- **The live `titan.effects` pack was seeded through the game API, not by `npm run build:packs`.** The
  running world holds an exclusive LevelDB lock on every declared pack, stopping the Foundry process is
  blocked for the autonomous session, and `/setup` needs the admin password, so the compile script was
  validated against a scratch directory (20 keys: 3 folders + 17 effects, `_key` stripped, folder refs
  intact) and the live pack was filled with the same source through `Folder.createDocuments` /
  `ActiveEffect.createDocuments` (`keepId: true`). The next `npm run build:packs` with the world returned
  to setup clears and recompiles the pack to identical content — no drift is possible because the source
  ids are the document ids.
- **`ci.yml` gates on ESLint errors only; the warning baseline is ~3000 JSDoc warnings** (mostly
  `jsdoc/require-description` on Svelte props typedefs). They do not fail the workflow. Raising the gate
  to `--max-warnings 0` requires that sweep first.
- **The two workflow files landed in commit `194c1991` ("keep the Select dropdown anchored")**, not in the
  OPEN_BUGS #2 commit: they were staged before the Select commit and `git commit` commits the whole index.
  History was left intact rather than rewritten; the #2 commit message points at `194c1991`.
- **Surface capture method.** Every TITAN surface was screenshotted in two themes by a throwaway
  Playwright spec (login → theme setting → render sheets/dialogs/cards → `locator.screenshot()` into
  `debug/dumps/surfaces/`). It found three shipped defects (CLOSED_BUGS #36-#38) that the localization
  and layout e2e suites had missed because they did not open those dialogs or seed a description. A
  spec that scans a surface must render the STATE that exposes the text (an effect WITH a description,
  every check dialog, a spell WITHOUT a tradition).
