# Architecture & Directory Map

## Top-level src/ layout

- `src/index.js` — Build and module entry point; imports global SCSS and registers Foundry hooks.
- `src/check/` — Dice-check engine: base `Check.js` + `CheckResults.js`, a shared dialog and chat-message shell, and
  five concrete check types (`attack-check`, `attribute-check`, `casting-check`, `item-check`, `resistance-check`),
  each owning its own dialog and chat-message subcomponents.
- `src/document/` — All Foundry document classes, data models, and sheets. Contains a shared base layer
  (`data-model/`, `sheet/`, `dialog/`, `svelte-components/`) plus per-type implementations under `types/`
  (actor, item, chat-message, combat).
- `src/helpers/` — Shared utilities consumed across the whole codebase: many single-function files in
  `utility-functions/`, reusable Svelte components in `svelte-components/`, system settings definitions in `Settings/`,
  Svelte actions in `svelte-actions/`, world-migration logic in `migration/`, and shared dialog helpers in `dialogs/`.
- `src/hooks/` — One file per Foundry hook, each exporting a single handler. See "## Module boundaries" for
  specifics on which hooks are wired and when.
- `src/sidebar/` — Custom sidebar-tab layer. `TitanEffectTrayTab.js` (extends `AbstractSidebarTab`, mounts Svelte
  like a sheet) plus a `tray/` folder of the Effect Tray UI (`EffectTrayState.svelte.js` runes state,
  `GetEffectCompendiums.js`, and the shell/tray/header/list/row components). Registered in `OnceInit.js`. See
  `abstractions.md` "Effect Tray sidebar tab".
- `src/ui/` — Screen-level (non-sheet, non-sidebar) Svelte mounts. Currently holds `effect-hud/` — the native
  Effect HUD: a `TitanEffectHud` singleton controller (created on the `ready` hook, attached as
  `game.titan.effectHud`) that mounts `EffectHudShell` into a fixed-position container appended to `#interface`.
  A pure `ResolveHudActor.js` ladder picks the tracked actor; `EffectHudState.svelte.js` holds the runes UI state
  (`collapsed`), preserved across remounts. The shell sets the active actor's `ReactiveDocument` bridge as the
  `document` context, so the reused effect leaf components (checks, description, owner-gated delete) resolve the
  actor exactly as they do inside the character sheet. See `data-flow.md` "Effect HUD".
- `src/styles/` — Global SCSS: font imports (`Lato.scss`, `OpenSans.scss`), CSS custom-property variables
  (`Variables.scss`), global resets (`Global.scss`), a prepended `Root.scss` (injected into every Svelte component
  via svelte-preprocess), and a `Mixins/` folder of per-domain SCSS mixin files covering flex, font, border, button,
  panel, tag, input, label, list, margin, padding, rarity, resistance, separator, system, and attribute domains.
- `src/system/` — System-wide constants and registrations: constant and registration modules covering attributes,
  skills, conditions, icons, settings registration (`SystemSettings.js`), initiative formula (`Initiative.js`),
  macros (`Macros.js`), trackable attributes (`TrackableAttributes.js`), and enumeration files (roles, resistances,
  resources, speeds, etc.).

## Module boundaries

**Entry point:** `src/index.js` is the single ES-module entry. It:
1. Imports and applies the three global SCSS files.
2. Imports most hook handlers from `src/hooks/` and binds them to Foundry's `Hooks` API. The `hotbarDrop` hook is
   the exception — it is registered lazily inside `OnceReady.js` at ready-time.

**`src/hooks/` wiring:**
- `OnceInit.js` (Foundry `init` hook) does all heavy registration: creates `game.titan` namespace, calls
  `registerSystemSettings()` and `registerInitiativeFormula()` from `src/system/`, sets `CONFIG.Actor`,
  `CONFIG.Item`, `CONFIG.ChatMessage`, and `CONFIG.Combat` document classes and data models from `src/document/`,
  and registers all sheet classes. It also registers the custom Effect Tray sidebar tab additively —
  `foundry.applications.sidebar.Sidebar.TABS.titanEffects = { icon, tooltip }` plus
  `CONFIG.ui.titanEffects = TitanEffectTrayTab` (no `Sidebar` subclass; core instantiates `ui.titanEffects`).
- `OnceSetup.js` (Foundry `setup` hook) calls `setupConditions()` from `src/system/Conditions.js`. That module
  exports a pure `buildConditionDefinitions()` (no `game`/localize access, unit-tested) returning the static
  condition list — every entry is `type: 'condition'`, and the six mechanically-active conditions (blinded,
  contaminated, prone, restrained, stunned, sleeping) carry a `system.rulesElement` array; `setupConditions()`
  consumes it, localize-sorts, enriches each with `flags`, and pushes to `CONFIG.statusEffects`.
- `OnceReady.js` (Foundry `ready` hook), for the GM, unconditionally runs the one-shot effect-item→Active-Effect
  converter, then runs the version-chain migration if needed (both from `src/helpers/migration/`); for all users it
  registers the `hotbarDrop` sub-hook via `OnHotbarDrop.js`.
- `OnCombatNextTurn.js` / `OnCombatPreviousTurn.js` delegate to actor system methods (`onTurnStart`, `onTurnEnd`,
  `onInitiativeAdvanced`) on `TitanActor`.
- `OnRenderChatMessageHTML.js` mounts `ChatMessageShell.svelte` (from `src/document/types/chat-message/`) onto
  titan-flagged chat messages via Svelte 5 `mount()`, passing a `ReactiveDocument` bridge as the `documentStore`
  prop.
- `OnPreDeleteChatMessage.js` fires before a chat message is deleted (e.g., to clean up associated data).
- `OnGetChatLogEntryContext.js` adds custom entries to the chat-log context menu.
- Directory-context hooks (`OnGetActorDirectoryEntryContext`, `OnGetItemDirectoryEntryContext`) add UUID
  management options via helpers in `src/helpers/utility-functions/`.

**`src/system/` provides to `hooks/` and `document/`:** Pure constants and registration functions — no runtime
document state. `OnceInit.js` is the only consumer that calls its registrations at startup.

**`src/helpers/` provides to everyone:** Stateless utility functions (`Localize`, `Log`, `Assert`, `Warn`, `Error`,
combat-effect appliers, token/actor getters); reusable Svelte UI components (`BorderedColumnList`, `Tabs`, `Meter`,
`Text`, `RichText`, `ScrollingContainer`, generic buttons/inputs/selects/labels/tags); the `SocketManager` for
cross-client communication and the `ActionQueue` serial task queue for sequencing racy async mutations;
`TransientDefinitions` for runtime-only data; and the `Settings/` folder of per-setting accessor functions
consumed throughout.

**`src/check/` depends on:** `src/helpers/utility-functions/RollCheckDice.js` for dice rolling, and
`src/document/` actor/item system data for deriving check parameters. Check dialogs and chat-message components are
self-contained Svelte UIs that live beside their check type.

**`src/document/` depends on:** `src/helpers/` for utilities and shared Svelte components;
`src/system/` for constants and enumerations; `src/check/` to launch checks from actor/item methods.
Base classes (`TitanDataModel.js`, `TitanDocumentSheet.js`) in `document/data-model/` and `document/sheet/` are
extended by every concrete type under `document/types/`.

## Test layout

Unit tests live under `tests/` (excluded from the Vite build); Vitest is configured in `vitest.config.mjs`
(`environment: 'happy-dom'`, `globals: true`, `include: ['tests/unit/**/*.test.js']`):

- `tests/setup.js` — global Vitest setup: injects `globalThis.foundry` (with `MockDocument` and `mergeObject`)
  and a fresh `HooksMock` on `globalThis.Hooks` before every test.
- `tests/unit/` — Vitest unit tests (`.test.js`).
- `tests/components/` — Svelte probe components used by unit tests (e.g. `DocumentProbe.svelte`).
- `tests/shared/` — Framework-agnostic fixture helpers shared by Vitest and Playwright:
  - `fixtureConstants.js` — typed constants for known fixture values (e.g. `FLAT_MODIFIER`).
  - `builders.js` — pure factory functions returning plain `Document.create` payloads (no live documents,
    no side effects); consumed by Vitest directly and by Playwright via `Document.create` or
    `page.evaluate`.
  - `combat.js` — `seedCombatEncounter` and `teardownCombatEncounter`: self-contained async functions
    designed to be passed directly to `page.evaluate`. `seedCombatEncounter` creates two actors, a scene,
    one token per actor on the scene, a `Combat` document bound to the scene, and two `Combatant` documents
    with explicit deterministic initiative (effect actor at the lower value = turn index 1; other actor at
    the higher value = turn index 0 after `startCombat`). Returns `{sceneId, combatId, effectActorId,
    otherActorId, effectCombatantId}`. `teardownCombatEncounter` deletes combat, scene, and both actors in
    that order.
- `tests/e2e/` — Playwright end-to-end specs targeting a live Foundry instance.
  - `combat-seed.spec.js` — Phase 4 smoke test (1 test): seeds a two-combatant encounter with
    `seedCombatEncounter`, then probes that `combat.turns.length === 2`, `combatant.actor` resolves to the
    seeded effect actor, `actor.system.isCharacter === true`, `getCharacterCombatants().length === 2`, and
    `combat.turn === 0` (other actor holds turn 0 at start; effect actor waits at turn 1 for `nextTurn()`).
  - `integration-manifest.spec.js` — Phase 3c "drift guard" suite (7 tests): declared documentTypes ↔
    registered dataModels parity (covers Actor, Item, ActiveEffect, ChatMessage); every manifest pack loaded
    with correct metadata; grid/socket config; Titan document-class subclass identity; per-subtype sheet
    registration and core-sheet unregistration; runtime CONFIG flags (`CONFIG.time.roundTime === 6`,
    `CONFIG.ActiveEffect.legacyTransferral === false`, initiative formula prefix `@rating.initiative.value`);
    titan status-effect conditions present in `CONFIG.statusEffects` and a representative set of
    `game.settings.settings` keys registered. (The former `'ChatMessage declares no document subtypes'` test
    was removed when ChatMessage gained 5 registered subtypes in Task 4.)
  - `permissions-ownership.spec.js` — Phase 4b B1 ownership-level suite (4 tests): seeds a `player`-type actor
    with `ownership: { default: 0, [playerId]: level }` for each of NONE/LIMITED/OBSERVER/OWNER; asserts the
    player client's `testUserPermission` results and sheet render/visibility at each level. Key fixture decision:
    `default: 0` is always set explicitly so world-default ownership does not leak into the NONE case. The NONE
    test gates on `game.actors.get(id) === undefined` (actor absent from player collection) rather than on
    `waitForFunction` resolving to a truthy value.

## Build and output

**Vite configuration** (`vite.config.mjs`):
- `root` is set to `src/` — all source paths resolve from there.
- Path aliases: `~/` maps to `src/` (used throughout, e.g. `~/helpers/…`); `$fonts/` maps to the repo `fonts/`
  directory.
- Build entry: `src/index.js` (referenced as `./index.js` relative to root).
- Output format: ES module (`formats: ['es']`), output file named `index` → `index.js` in `dist/`.
- `outDir` is `dist/` (`path.join(__dirname, 'dist')`); `emptyOutDir: true` so each build self-cleans stale chunks.
- CSS is extracted and emitted as `style.css` in `dist/`; PostCSS runs `autoprefixer` (configured directly in
  `vite.config.mjs`, no TyphonJS rollup config).
- SCSS preprocessing uses two paths: `svelte-preprocess` (Svelte component styles) uses `api: 'modern'` and
  prepends `@use "src/styles/Root.scss" as *;` to every `<style lang="scss">` block automatically; the global
  `css.preprocessorOptions.scss` path uses `api: 'modern-compiler'`.
- Compression (`s_COMPRESS`) is `false` by default; source maps (`s_SOURCEMAPS`) are enabled.
- Target: `es2022` for both esbuild and Rollup/Terser.

**Manifest wiring** (`system.json`):
- `"esmodules": ["dist/index.js"]` — Foundry loads the compiled ES module from `dist/`.
- `"styles": ["dist/style.css"]` — Foundry loads the compiled CSS from `dist/`.
- Document types declared: Actor (`player`, `npc`), Item (`ability`, `armor`, `commodity`, `equipment`,
  `shield`, `spell`, `weapon`), ActiveEffect (`effect`, `condition`), ChatMessage (`attributeCheck`,
  `resistanceCheck`, `attackCheck`, `castingCheck`, `itemCheck`). The five ChatMessage check subtypes are
  fully registered: declared in `system.json`, mapped to data models via `CONFIG.ChatMessage.dataModels` in
  `OnceInit.js`, and labelled under `TYPES.ChatMessage` in `lang/en.json`. Later phases will add
  item/report/effect subtypes.
- `"socket": true` enables the system socket used by `SocketManager`.
- Foundry compatibility (`system.json`): minimum v13, verified v14, maximum v14.
