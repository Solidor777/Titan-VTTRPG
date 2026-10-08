# Post-Work Findings

Living record of post-work review issues — gotchas, accepted limitations, and issues that deserve
attention. NOT a to-do list (deferred work goes to `docs/TODO.md`; bugs go to `docs/OPEN_BUGS.md`).

### Foundry v14 core: a token's deletion stores a tombstone only where its base actor holds the id (2026-10-01)

Measured live 3 times with a raw-data token, pending real-path re-run, as the active GM with Migration Mode Disabled, on
an unlinked world-scene token named apart from its base actor (so its delta is stored, OPEN_BUGS #102). Each deletion
was a one-id `deleteEmbeddedDocuments` through the token's synthetic actor, read back after a reload from
`token._source.delta` and from a server fetch (`Scene.database.get`):

- the token's own Item, which the base actor lacks: no tombstone stored;
- the token's own Active Effect, which the base actor lacks: no tombstone stored;
- the token's override of a valid Item the base actor holds: `{_id, _tombstone: true}` stored.

Read in core, not run: the client's `EmbeddedCollectionDelta#_delete`
(`common/abstract/embedded-collection-delta.mjs:242-253`) tombstones only an id its base collection holds, which
matches. The server's `EmbeddedDeltaMixin#batchDelete` (minified `dist/database/backend/embedded-delta.mjs`) reads as
writing a `TombstoneData` for every deletion, which the measurement contradicts; where that record is dropped was not
diagnosed. The measured stored outcome governs: the Adventure path (`deleteFromData` in
`src/helpers/migration/StoredActorSources.js`) stores what was measured. A legacy `effect` Item of the base actor could
not be seeded (the server refuses the subtype, even through a raw socket create), so a deletion over one follows the
client's `_delete` (an invalid document is never in a base collection) and is not measured.

### Foundry v14 core: an orphaned token's delta cannot be written to (2026-10-01)

An orphaned token is an unlinked token whose base actor is gone. Core cannot create or delete entries in its
ActorDelta, so the stored-actor migration never writes such tokens on world scenes and in world Scene packs
(`walkSceneTokens`, `walkScenePackRecord` in `src/helpers/migration/StoredActorSources.js`). It reports one whose own
delta holds pending work as a failure that names its scene and the token and says to delete the token (CLOSED_BUGS
#105).

Measured live with raw-data tokens, pending real-path re-run, on a world-scene token and a Scene-pack token, with a
second GM connected and a reload read-back:

- A parent write that adds an entry fails the client's dry run, and nothing is stored. This held for a Token update
  (default options, `recursive: false`, and `diff: false, recursive: false`) and for `scene.update({ tokens })`. The
  error is in `EmbeddedCollectionDelta#_prepareDeltaUpdate` (`common/abstract/embedded-collection-delta.mjs:195-207`),
  which reads the missing base collection for an id the delta does not manage.
- A parent write that leaves an entry out of the array, or deletes it with a `-=` key or `_del` inside
  `delta.items`, stores nothing and logs nothing.
- A parent update of an entry the delta already holds is stored with no error, and tombstones survive every write.

Measured live with a raw-data token, pending real-path re-run, on the Scene-pack token only, without a read-back (the
run stopped at the throw): an embedded create on the delta (`token.delta.createEmbeddedDocuments`) threw
`Cannot read properties of null (reading 'tokenActiveEffectChanges')` on the client, from `#handleCreateDocuments`.

Read in core, not run: the throw site is `TokenDocument#_onRelatedUpdate` (`client/documents/token.mjs:3809`), which
reads `this.actor` while the token's actor is null (:253-257). The same create on the world-scene token, and every
embedded update and delete, reach that line (:3755-3774).

Inferred, not read back: the throw comes after the server write, because `#handleCreateDocuments` handles the
server's response.

An Adventure's scene tokens are inline data, written with `adventure.update({ scenes })`. One such write (live with a
raw-data token, pending real-path re-run) stored a create, an update and a delete on a token whose actor id names no
actor, with no client error, so Adventure tokens are migrated whatever their base actor. Orphaned tokens were removed
from the user's worlds by a one-off cleanup outside the code (2026-10-01). Any other world keeps the stale conditions
and legacy effect Items of its orphaned tokens until those tokens are deleted, and its GM sees a migration prompt
(Prompt) or a reported failure (Automatic) on every load until then.

### Adventure packs are read whole on every Prompt or Automatic GM load (2026-09-30)

The stored-actor scan (`storedActorsNeedMigration`, `src/helpers/migration/MigrateStoredActors.js`) reads the full
`actors` and `scenes` of every world Adventure pack on each Prompt- or Automatic-mode load of the active GM whenever no
earlier location has pending work, a clean world included, and reads the `actors` a second time with the `scenes` (an
unlinked scene token inherits its base actor's effects, and the Adventure may hold that actor); a migrating load reads
them up to three times (the load's scan, `migrateWorld`'s own scan, and the pass). The server cannot narrow them: a pack
projection (`PACK_PROJECTION_FIELDS`) projects a dotted field per record only inside a document's embedded collections
(its `hierarchy`, built from `EmbeddedCollectionField` and `EmbeddedDocumentField`), and otherwise filters with
`filterObject`, which keeps an array value whole (Foundry v14 `common/utils/helpers.mjs:622-642`); an Adventure's
`actors` and `scenes` are `SetField`s of `EmbeddedDataField` (`common/documents/adventure.mjs:41,45`), not embedded
collections. Only world-package packs are read. A cache of packs found clean at a modification time was rejected: a
stale record would silently skip a needed migration. The cost scales with the size of the world's Adventure packs.

### Foundry v14 core: a pending ContextMenu close removes the instance's next menu (2026-09-28)

Core's `ContextMenu#close()` (`client/applications/ux/context-menu.mjs:273-291`) awaits a 200 ms collapse animation and
then calls `_close()`, which removes `this.#element` as it stands at that moment. The global
`document` click listener (`ContextMenu.activateListeners`) calls `ui.context?.close()` on every click, and
`ui.context` stays set until the first close resolves, so each click in that window queues another close. If the same
instance re-renders (a right-click on the same directory) before those closes resolve, they remove the new menu: no
menu shows, and a click on one of its entries retries on a detached node until the test times out. Too fast for a
human to hit; Playwright hits it. Measured with an in-page trace of `render`/`close`/`_close`: the Export dialog's
format-select, option, and confirm clicks queued three closes whose `_close` ran after the next pack right-click's
`render`, removing its menu. It broke three `compendium-spreadsheet.spec.js` tests (re-open the pack's menu after an
export) under the 09-28 branch head AND under the `e95f064f` (09-27) source, and the spec is unchanged since 09-11,
so the failure predates the 09-28 work; it is a race whose outcome varies run to run. Core bug, not ours (no engine
fork). Harness rule: choose core context-menu entries through `chooseContextMenuEntry` (`tests/e2e/contextMenu.js`),
which waits for the menu to detach before any further click, so no close is left pending. The `ERR_CONNECTION_REFUSED`
console errors seen in the same runs are the Wiretap module retrying its sidecar on `localhost:31416` (backing off to ~7
s) from login onward; they are unrelated.

### Armor-trait situations are narrowed to the Skill their checks use (2026-09-28)

Heavy and Encumbering's "Swim, Fly, or Climb" situation and Heavy's "Jump" are narrowed to Athletics; Loud's "Remain
Undetected by Hearing" is narrowed to Stealth. The rules name Athletics for jumping (line 2300) and climbing (lines
3150 and 5019) but name no Skill for swimming or flying: narrowing them to Athletics is a design choice, made because
Swim, Fly, and Climb share one situation. Unnarrowed, the situations would make every check a situational check, so
under the default `getCheckOptions` choice `situational` an armored character would open the check dialog on every
roll, Resistance checks included. The narrowing lives in `createArmorTraitCheckModifiers`
(`src/document/types/item/types/armor/ArmorTraitCheckModifiers.js`). Line numbers are those of
`docs/TITAN Rules Compendium - Source - 09_26_2026.md`.

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
`updateCombat` render arrives for a combat the tracker is NOT viewing, the `find` returns
`undefined` and the render throws an uncaught
`Cannot use 'in' operator to search for 'turn' in undefined` on every round/turn update. The tracker
keeps the combat it views (`_configureRenderOptions` infers one only while `viewed` is null). Measured
in `test-titan` (CLOSED_BUGS #116): every client views the world's own scene-less combat, so a seeded
encounter's updates throw on each client that does not view it. Harness: `seedCombatEncounter` sets
`ui.combat.viewed` on the seeding client and `teardownCombatEncounter` clears it; a spec with other
clients seeds through `seedEncounterForClients` (`tests/e2e/multiClient.js`), which makes each client
view the combat before it starts. Any other combat-driving e2e that bypasses the shared seeder must do
the same on every connected client. Surfaced by the `effectsExpiredReport` e2e (TODO #13).

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
- **Hidden sidebar tabs populate the DOM: page-level row locators must be scoped to the open sheet.** Foundry
  renders every sidebar tab at ready, so once the shipped `titan.effects` pack is seeded the Effects tray keeps
  17 invisible `[data-effect-id]` rows in `#sidebar` ahead of any sheet in document order. Five
  `reactive-*` e2e cases that used `page.locator('[data-effect-id]').first()` silently matched a hidden tray
  row (Playwright reports "element(s) not found" for the row's inputs, or times out clicking). Every row
  locator in `tests/e2e` now reads `page.locator('.application.titan-document-sheet [data-item-id|data-effect-id]')`;
  new specs must scope the same way (`data-item-id` rows would fail identically the day another always-mounted
  surface renders them).
- **`.agents/skills/titan-codebase/` is a tracked, stale copy of `.claude/skills/titan-codebase/`** (last touched
  by commit `5526adee`; every reference file differs). The project rules name `.claude/skills/titan-codebase/`
  as the maintained skill; the `.agents` copy was left untouched.

## 2026-09-10 — Orphaned Playwright-launched Foundry

- **A `playwright test` run from 2026-09-09 hung with its runner alive and left the Foundry it had launched
  running for a day.** Playwright's `webServer` only tears its server down when the runner exits, so a hung
  or hard-killed runner orphans the server: it kept port 30000, blocked the user's own Foundry launch, and
  held the pack LevelDB locks that stopped `build:packs` during the backlog campaign. `webServer.command` is
  now `scripts/e2e-foundry-server.mjs`, which supervises the launched server and kills it when the Playwright
  runner process disappears (verified: killing a stand-in runner freed the port within seconds; a real
  `render-smoke` run launched, passed, and left no process behind). A run that hangs while its runner stays
  alive is indistinguishable from a long run and is still not caught — stop the runner and the server follows.
- **A Playwright-launched Foundry now opens `test-titan` directly (`--world=`).** Without it a fresh server
  lands on the setup screen, where the `login` fixture cannot join.

## 2026-10-01 — Created documents do not come back in input order

- **`createEmbeddedDocuments` returns its documents in the order core assigns their ids, not in input order.** The
  server's `_createDocuments` (`dist/database/backend/server-backend.mjs`) builds its result inside a
  `Promise.all`. Entries that keep their own `_id` are pushed at once; entries needing a generated id are pushed
  when their `createNewId()` resolves. Measured in `test-titan` (Task 5 fix round 2): entries with their own `_id`
  came first in 3 of 3 runs, and generated ones came back reordered (for example `[C1, C3, C2]`) in 2 of 3 runs. Code
  and tests that pair created documents with their inputs must match them by id or name, never by position.

## 2026-10-07 — A presence check must come before an `every` over a filtered list

- **`array.filter(...).every(...)` is true when the filtered list is empty.** The player HUD resize test asserted
  `.every` over the mounted HUD elements and passed while the effects panel was not mounted at all (found in Phase 5
  Part A: the check failed on its first run once a presence assertion was added, `gate-resize-panel-absent-fail.log`).
  Assert that each element is mounted before the quantified check.

## 2026-10-07 — A started combat left behind is the viewed combat of every later spec

Measured (`.superpowers/sdd/test-suite-rewrite/phase-5/b/leftover-combat-probe.log`, Phase 5 Part B): a combat made with
the Combat Tracker's create button has no scene (`scene: null`), so on a page that boots after `combat-turns.spec.js`,
`game.combat` and `ui.combat.viewed` were that combat, started. The Player HUD's combat-only gate reads
`game.combat?.started` (read: `TitanPlayerHud.js:259`), and the full run's `player-hud.spec.js` "combat-only hides the
portrait outside combat" failed on it (`e2e-full-b1.log`). A spec that leaves a combat for the teardown leaves it
unstarted (`phase-5/b/leftover-combat-probe-2.log`: `game.combat` is the unstarted one).

`test-titan` held a combat created on 2026-06-18 (four combatants, no scene) that no spec made. The suite's
`createCombat` changed it: its `modified` time equalled the suite-made combat's to the millisecond
(`leftover-combat-probe-2.log`: 1791417134060 on both), it read `active: false` while the suite's combat existed, and
`active: true` in a probe after the teardown. Inferred, not measured: core deactivates the previously active combat when
a new one is activated and activates another when the active one is deleted. On the user's instruction of 2026-10-07 it
was deleted (the only combat in the world; backup `phase-5/b/combats-backup-2026-10-08T03-10-48-197Z.json`,
`delete-old-combats.log`). The census still has no Combat class (`docs/TODO.md`).
