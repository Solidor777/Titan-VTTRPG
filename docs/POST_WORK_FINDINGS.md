# Post-Work Findings

Living record of post-work review issues — gotchas, accepted limitations, and issues that deserve
attention. NOT a to-do list (deferred work goes to `docs/TODO.md`; bugs go to `docs/OPEN_BUGS.md`).

### Tempest Herald's immunities are a hand list of condition ids (2026-10-09)

The compendium effect Tempest Herald carries one `immunity` element for each condition id of
`buildConditionDefinitions` (`src/system/Conditions.js`) except `dead` (11 elements). A condition added to the system
later is not covered until the effect gains its element; no system test or selector enforces the list (the user
accepted this on 2026-10-09). The module's verification script checks the list against the system source at the time of
the edit only.

### Compendium edits reach new copies only (2026-10-09)

The compendium corrections (speed and immunity effects, spell aspects, check entries and traits) change the module's
packs. Items and effects already copied into a world, an actor, or an item keep the data they hold; no migration updates
them (project scope: no migrations yet). A copy is refreshed by dropping the corrected compendium document again.

### Foundry v14 core: a token's deletion stores a tombstone only where its base actor holds the id (2026-10-01)

Measured live 3 times with a raw-data token, not re-run; no migration tests while no migration is active (project
rule), as the active GM with Migration Mode Disabled, on an unlinked world-scene token named apart from its base actor
(so its delta is stored; see CLOSED_BUGS #102). Each deletion was a one-id `deleteEmbeddedDocuments` through the token's
synthetic actor, read back after a reload from `token._source.delta` and from a server fetch (`Scene.database.get`):

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

Measured live with raw-data tokens, not re-run; no migration tests while no migration is active (project rule), on a
world-scene token and a Scene-pack token, with a second GM connected and a reload read-back:

- A parent write that adds an entry fails the client's dry run, and nothing is stored. This held for a Token update
  (default options, `recursive: false`, and `diff: false, recursive: false`) and for `scene.update({ tokens })`. The
  error is in `EmbeddedCollectionDelta#_prepareDeltaUpdate` (`common/abstract/embedded-collection-delta.mjs:195-207`),
  which reads the missing base collection for an id the delta does not manage.
- A parent write that leaves an entry out of the array, or deletes it with a `-=` key or `_del` inside
  `delta.items`, stores nothing and logs nothing.
- A parent update of an entry the delta already holds is stored with no error, and tombstones survive every write.

Measured live with a raw-data token, not re-run; no migration tests while no migration is active (project rule), on the
Scene-pack token only, without a read-back (the run stopped at the throw): an embedded create on the delta
(`token.delta.createEmbeddedDocuments`) threw `Cannot read properties of null (reading 'tokenActiveEffectChanges')` on
the client, from `#handleCreateDocuments`.

Read in core, not run: the throw site is `TokenDocument#_onRelatedUpdate` (`client/documents/token.mjs:3809`), which
reads `this.actor` while the token's actor is null (:253-257). The same create on the world-scene token, and every
embedded update and delete, reach that line (:3755-3774).

Inferred, not read back: the throw comes after the server write, because `#handleCreateDocuments` handles the
server's response.

An Adventure's scene tokens are inline data, written with `adventure.update({ scenes })`. One such write (live with a
raw-data token, not re-run; no migration tests while no migration is active (project rule)) stored a create, an update
and a delete on a token whose actor id names no actor, with no client error, so Adventure tokens are migrated whatever
their base actor. Orphaned tokens were removed from the user's worlds by a one-off cleanup outside the code
(2026-10-01). Any other world keeps the stale conditions and legacy effect Items of its orphaned tokens until those
tokens are deleted, and its GM sees a migration prompt (Prompt) or a reported failure (Automatic) on every load until
then.

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
  same-named fallback, so at most one exists per name; the existing duplicates were purged. (The helper was deleted
  in Phase 6 of the test-suite rewrite; the specs make scenes, actors and tokens through the registry's flows.)
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
(`leftover-combat-probe-2.log`: 1791417134060 on both) and it read `active: false` while the suite's combat existed.
Read: `"active": true` at line 123 of `phase-5/b/combats-backup-2026-10-08T03-10-48-197Z.json`, the `toObject()` the
delete script saved when it read the combat, before the delete. Inferred, not measured: core deactivates the previously
active combat when a new one is activated and activates another when the active one is deleted. On the user's
instruction of 2026-10-07 it was deleted (the only combat in the world; backup
`phase-5/b/combats-backup-2026-10-08T03-10-48-197Z.json`, `delete-old-combats.log`). The census now counts every
combat and the sweep removes any (`phase-6/combat-census-probe.log`).

### Foundry v14 world LevelDB: embedded documents live in their own sublevels, and a stopped world's database is readable (2026-10-08)

Measured by reading a copy of `worlds/soresokai/data/*` with `classic-level` (scanner:
`.superpowers/sdd/test-suite-rewrite/non-titan-effects/scan.mjs`). An actor's record holds only the ids of its effects
(`effects: [id, ...]`); each effect's data is its own record under the sublevel `!actors.effects!<actorId>.<effectId>`,
a token delta's under `!scenes.tokens.delta.effects!<sceneId>.<tokenId>.<actorId>.<effectId>`, and a deleted inherited
effect is a `{_id, _tombstone: true}` record there. A scan that only walks an array of effect objects inside the parent
record finds none. A world that is not the server's active world has no LevelDB lock and can be copied and read while the
server runs; the active world's and every loaded package's pack databases hold `LOCK` (a `cp` of their directories fails
only on that file, and the copy opens).

### The e2e server runs a different Foundry build than `C:\FoundryVTT\V14\foundry` (2026-10-08)

Measured: `scripts/e2e-foundry-server.mjs` launches `appDir = <dataPath>/../foundry`, i.e. `C:\FoundryVTT\V14\dev\foundry`
(`package.json` build 364; `/api/status` reports 14.364), while `C:\FoundryVTT\V14\foundry` is build 368. The two differ in
`ActiveEffect#prepareBaseData`: 364 reads `CHANGE_TYPES[type]?.priority` (`dev/foundry/public/scripts/foundry.mjs:49749`),
which is never defined, so a change with an unset priority is prepared at priority 0; 368 reads `.defaultPriority`
(`foundry/public/scripts/foundry.mjs:50013`), so multiply (10) runs before add (20). Measured on 364 with the model
inheriting core's `changes` (`ae-mixin/after.log`): add 3 then multiply 2 with no priority gives 6; with 368's
`prepareBaseData` body patched in on the page (`patchedCorePriority`) it gives 3. A spec that asserts the applied order of
unset-priority changes passes only on 368; `tests/e2e/effect-changes.spec.js` asserts the stored (unset) priority and the
sheet's default-priority placeholder instead.


### Condition effects are synced to their definitions by the stored-actor migration (2026-10-09)

A condition Active Effect keeps the rules elements copied at creation, so a changed definition in
`src/system/Conditions.js` reaches an existing condition only through `getConditionEffectUpdate`
(`src/helpers/migration/SyncConditionEffects.js:43`), which the stored-actor migration applies to every stored actor
(`MigrateStoredActors.js:120`) and `storedActorNeedsMigration` counts as pending work (`:38`). It matches an effect to
its definition by its single status against `buildConditionDefinitions()` (`findConditionDefinition`,
`Conditions.js:283-290`, core's `toggleStatusEffect` rule; never the mutable `CONFIG.statusEffects`), compares rules
elements as sorted-key JSON (`toCanonicalJson`, so the key order a writer used never makes a current effect stale), and
writes one update per stale effect: `system.rulesElement` when it differs, and `flags.titan.description` set to `_del`
when a description is stored (`SyncConditionEffects.js:71-74`; the module documents `_del` as v14's deletion operator
and the `-=` key form as deprecated). An effect with several statuses, or a status naming no system condition, is left
alone. The walk reads stored data only, over `STORED_ACTOR_LOCATIONS` (world actors, unlinked world-scene tokens, Actor
packs, Scene-pack tokens, Adventure actors and tokens; `StoredActorSources.js:117-124`), so a clean token's synthetic
actor is never materialized. A GM's hand edit to a condition effect's rules elements is replaced on the next migrating
load (OPEN_BUGS #110). Disabled resolves before any scan (`resolveMigrationAction`, `MigrateWorld.js:333-336`); in
Prompt mode a world with stale conditions shows the migration dialog on each GM load until the GM confirms; a failed
migration is reported through `error()` and the hot-bar drop hook and the Player HUD still load (`OnceReady.js:22-37`).

### Condition descriptions are read from the definitions, never stored (2026-10-09)

`setupConditions` flags `CONFIG.statusEffects` entries with `flags.titan.type` only (`Conditions.js:344-350`), so the
condition Active Effects core creates carry no description. The Player HUD's `EffectsDetailBody` calls
`getConditionDescription(effect)` (`EffectsDetailBody.svelte:42`): the effect's own non-blank description (a GM's edit,
`getEditedConditionDescription`), else the definition's text looked up by the effect's single status and localized at
render. A turn-start report entry (`_getEffectReportEntry`, `CharacterDataModel.js:5810-5842`) stores an edit as
`description` and an unedited condition's localization key as `descriptionKey`; `buildEffectTagTooltip` localizes the
key at render (`BuildEffectTagTooltip.js:17`), so each reader sees their own language, and an entry that stores
`description` text, including one posted before reports stored keys, shows it as stored. No source file reads
`flags.titan.description` (grep of `src`, 2026-10-09: only the sync that deletes it), so one left on an older effect is
inert until the condition sync deletes it.

### Immunity suppression is separate from `disabled` (2026-10-09)

An immunity suppresses a condition or effect through the data models' `isSuppressed` (`ConditionDataModel.js:20`,
`TitanActiveEffectDataModel.js:41`; core then drops it from `actor.statuses`). `_applyRulesElements` skips only a source
whose Active Effect has `system.isSuppressed` (`CharacterDataModel.js:860`); `disabled` stays the gate for an effect's
own state, and `_getRulesElementSources` leaves a disabled effect out (`:804`). A suppressed effect's modifiers stop
applying, but `_getImmunities` reads every source of that list (`:697-727`), suppressed or not, so the immunities it
grants still apply: two effects each immune to the other are both suppressed, both immunities stay, and each one's tag
names the other. Reasoning, not measured: suppressing only what an unsuppressed effect grants has two fixed points
(either member of a mutually immune pair applying) and the rules supply no tiebreak. A suppressed effect's duration
keeps ticking (pinned for the turn-start, turn-end and initiative paths by `tests/e2e/combat-turns.spec.js:920`). A
suppressed entry stays in the actor's effects, and the sheet's effect rows, the Player HUD effects panel (list rows;
tray icons dim and the popout carries the tag) and the turn-start and turn-end reports (`EffectTag`) dim it and show
"Suppressed: <sources>", read from `getSuppressingImmunitySources` (`IsSuppressedByImmunity.js:10-20`), because
`isSuppressed` is a boolean and carries no source.

### Immunity removal runs on the changing client, and a mutual pair is never deleted (2026-10-09)

In Immunity Handling's Remove mode (the default) the deletion of an effect an immunity covers runs once, on the client
whose user made the change, from `TitanActor#_onUpdate`, `_onCreateDescendantDocuments` and
`_onUpdateDescendantDocuments` (`TitanActor.js:124-161`, guard `userId !== game.user.id` at `:178-181`); read in core,
Foundry dispatches the last two to an unlinked token's synthetic actor too (`TitanActor.js:166-170` cites
`client/documents/actor-delta.mjs`, 14.364). The removal re-derives everything from the prepared actor, runs serially
per actor (`pendingRemovals`, `ImmuneEffectRemoval.js:9`), and follows a world actor's change into its unlinked tokens
whose delta holds effects or items of their own, after the world actor's deletions land
(`removeImmuneEffectsWithDependents`, `:123-143`). `resolveImmuneEffectRemovals` is a grounded labelling of the effects'
immunity graph (Dung 1995): an effect in an immunity cycle is undecided and stays suppressed instead of being deleted.
Switching the setting to Remove makes the active GM run the removal over every world actor
(`removeImmuneEffectsFromWorld`, `:165`). The condition sync of a migrating load writes through
`actor.updateEmbeddedDocuments('ActiveEffect', ...)` for an actor document (`StoredActorSources.js:365`), a descendant
update by the GM; inferred from that read and `TitanActor.js:158-161`, not run, in Remove mode such a load also runs the
removal for each document-backed actor it syncs and deletes the condition effects an immunity covers. An Adventure
target is plain data (`StoredActorSources.js:561`), so its sync triggers no removal. Anything that makes an effect
immune without an actor update or a descendant create or update (none exists today) would bypass the removal until the
actor's next change.

### Target distance is measured between the nearest occupied spaces, and the dialog pins the target's facts (2026-10-09)

`measureTokenDistance` (`src/helpers/utility-functions/MeasureTokenDistance.js`) takes the shortest scene-grid
`measurePath` over every pair of occupied-space centers, in spaces; a gridless token is measured from its center, and it
returns `null` for a missing token or tokens of two scenes (`:18-20`). With `null`, no distance-based Prone modifier
applies (`TargetConditionModifiers.js:59`). The attacker's token is `_getAttackerTokenDocument()`
(`CharacterDataModel.js:2817-2821`): the attacker's controlled token, else the first of `getActiveTokens(false, true)`,
which lists only the Actor's tokens on the viewed canvas scene and is empty without a ready canvas
(`client/documents/actor.mjs:291-300`, build 364). The target is `_getAttackTargetToken()` (`:2807-2809`): the first
token of the user's targets whose Actor is a Character; only the GM fallback to controlled tokens (nothing targeted)
skips the attacker's own token ids (`GetTargetedCharacterTokens.js:10-21`), so an explicit target, even a second token
of the attacker's own Actor, is a target. A target resolved when the dialog opens fixes its Defense and its
`targetFacts` (`{ distance, statuses }`) in the dialog's `callerOptions` (`CharacterDataModel.js:2450-2466`); every
rebuild derives the Melee and Accuracy bonuses from the pinned facts and the attacker's live base ratings
(`:2748-2771`), so untargeting under the open dialog keeps the conditions (`tests/e2e/target-conditions.spec.js:372`)
and a changed base rating changes the bonus (`:443`). With no target at open, the modifiers stay derived and pick up a
later target.

### Chat visibility is applied by the client, not by delivery (2026-10-10, measured by `chat-visibility.spec.js`)

- Measured (run `t6-logs/run2.log`): a message whispered or blind to other users is still held in `game.messages` of a
  player who is not a recipient (`game.messages.has(id)` was true for Player 2 on a GM-mode message); the chat log DOM
  does not show it (`ChatMessage#visible`, Foundry 14.364 `client/documents/chat-message.mjs:101`). The specs therefore
  assert the DOM.
- Measured (run `t6-logs/run3.log`, specs 5-12 passed with the audience below): a Self message is in the chat log of its
  sender only; GMs do not see a Self message of a player. A GM-mode and a Blind message are in the logs of both GMs and
  the sender.
- Read, not measured: `ChatMessage#visible` returns true for any whispered message that carries rolls
  (`chat-message.mjs:101-106`), so an initiative roll from the sheet button shows its entry to every client with its
  content hidden by core (`isContentVisible`); `chat-visibility.spec.js` asserts the dice are absent for non-recipients.

### A token redraw can raise a `TokenRuler.draw` error in Foundry core (2026-10-10, read from `linked-token-sync.spec.js`)

- Measured (run `e2e-rerun2.log`, `linked-token-sync.spec.js` placed-token test): after a Token Configuration submit that
  changed the image, the GM page raised an uncaught `TokenRuler.draw … null._parentID` error. The measured stack held
  only core frames, and `src/` has no `TokenRuler` or `rulerClass` code (grep).
- Read, not reproduced without TITAN: `Token#_destroy` destroys the ruler without clearing `token.ruler`
  (`client/canvas/placeables/token.mjs:1211`), `_draw` reuses it (`:1286`), and `TokenRuler#draw` adds the destroyed
  path to the layer (`client/canvas/placeables/tokens/ruler.mjs:221`). Any token redraw may hit it.
- The spec discards this one error by its message and stack (`discardKnownPageErrors` in `tests/e2e/world.js`); every
  other page error still fails the test.
