# Architecture & Directory Map

## Top-level src/ layout

- `src/index.js` — Module entry point; imports global SCSS and registers all Foundry hooks via `Hooks.on` / `Hooks.once`.
- `src/check/` — Dice-check engine: base `Check.js` + `CheckResults.js`, a shared dialog and chat-message shell, and
  five concrete check types (`attack-check`, `attribute-check`, `casting-check`, `item-check`, `resistance-check`),
  each owning its own dialog and chat-message subcomponents.
- `src/document/` — All Foundry document classes, data models, and sheets. Contains a shared base layer
  (`data-model/`, `sheet/`, `dialog/`, `svelte-components/`) plus per-type implementations under `types/`
  (actor, item, chat-message, combat).
- `src/helpers/` — Shared utilities consumed across the whole codebase: ~60 single-function files in
  `utility-functions/`, reusable Svelte components in `svelte-components/`, system settings definitions in `Settings/`,
  Svelte actions in `svelte-actions/`, world-migration logic in `migration/`, and shared dialog helpers in `dialogs/`.
- `src/hooks/` — One file per Foundry hook; each file exports a single function that is registered in `src/index.js`.
  Covers `init`, `setup`, `ready`, combat turn progression, chat-message rendering, directory context menus,
  hotbar dropping, and journal sheet rendering.
- `src/styles/` — Global SCSS: font imports (`Lato.scss`, `OpenSans.scss`), CSS custom-property variables
  (`Variables.scss`), global resets (`Global.scss`), a prepended `Root.scss` (injected into every Svelte component
  via svelte-preprocess), and a `Mixins/` folder with 13 mixin files (flex, font, button, border, panel, tag, etc.).
- `src/system/` — System-wide constants and registrations: ~20 JS files covering attributes, skills, conditions,
  icons, settings registration (`SystemSettings.js`), initiative formula (`Initiative.js`), macros (`Macros.js`),
  trackable attributes (`TrackableAttributes.js`), and enumeration files (roles, resistances, resources, speeds, etc.).

## Module boundaries

**Entry point:** `src/index.js` is the single ES-module entry. It:
1. Imports and applies the three global SCSS files.
2. Imports every hook handler from `src/hooks/` and binds them to Foundry's `Hooks` API.

**`src/hooks/` wiring:**
- `OnceInit.js` (Foundry `init` hook) does all heavy registration: creates `game.titan` namespace, calls
  `registerSystemSettings()` and `registerInitiativeFormula()` from `src/system/`, sets `CONFIG.Actor`,
  `CONFIG.Item`, `CONFIG.ChatMessage`, and `CONFIG.Combat` document classes and data models from `src/document/`,
  and registers all sheet classes.
- `OnceSetup.js` (Foundry `setup` hook) calls `setupConditions()` from `src/system/Conditions.js`.
- `OnceReady.js` (Foundry `ready` hook) triggers world migration if needed (from `src/helpers/migration/`) and
  registers the `hotbarDrop` sub-hook via `OnHotbarDrop.js`.
- `OnCombatNextTurn.js` / `OnCombatPreviousTurn.js` delegate to actor system methods (`onTurnStart`, `onTurnEnd`,
  `onInitiativeAdvanced`) on `TitanActor`.
- `OnRenderChatMessageHTML.js` mounts `ChatMessageShell.svelte` (from `src/document/types/chat-message/`) onto
  titan-flagged chat messages using a `TJSDocument` store from `@typhonjs-fvtt/runtime`.
- Directory-context hooks (`OnGetActorDirectoryEntryContext`, `OnGetItemDirectoryEntryContext`) add UUID
  management options via helpers in `src/helpers/utility-functions/`.

**`src/system/` provides to `hooks/` and `document/`:** Pure constants and registration functions — no runtime
document state. `OnceInit.js` is the only consumer that calls its registrations at startup.

**`src/helpers/` provides to everyone:** Stateless utility functions (`Localize`, `Log`, `Assert`, `Warn`, `Error`,
combat-effect appliers, token/actor getters); reusable Svelte UI components (`BorderedColumnList`, `Tabs`, `Meter`,
`Text`, `RichText`, `ScrollingContainer`, generic buttons/inputs/selects/labels/tags); the `SocketManager` and
`ActionQueue` for cross-client communication; `TransientDefinitions` for runtime-only data; and the `Settings/`
folder of per-setting accessor functions consumed throughout.

**`src/check/` depends on:** `src/helpers/utility-functions/RollCheckDice.js` for dice rolling, and
`src/document/` actor/item system data for deriving check parameters. Check dialogs and chat-message components are
self-contained Svelte UIs that live beside their check type.

**`src/document/` depends on:** `src/helpers/` for utilities and shared Svelte components;
`src/system/` for constants and enumerations; `src/check/` to launch checks from actor/item methods.
Base classes (`TitanDataModel.js`, `TitanDocumentSheet.js`) in `document/data-model/` and `document/sheet/` are
extended by every concrete type under `document/types/`.

## Build and output

**Vite configuration** (`vite.config.mjs`):
- `root` is set to `src/` — all source paths resolve from there.
- Path alias `~/` maps to `src/`, used throughout for imports (e.g. `~/helpers/…`).
- Build entry: `src/index.js` (referenced as `./index.js` relative to root).
- Output format: ES module (`formats: ['es']`), output file named `index` → `index.js` at repo root.
- `outDir` is the repo root (`__dirname`); `emptyOutDir: false` to avoid wiping non-built files.
- CSS is extracted and emitted as `style.css` at repo root (PostCSS via
  `@typhonjs-fvtt/runtime/rollup`'s `postcssConfig`).
- SCSS preprocessing: `svelte-preprocess` with `api: 'modern'` prepends `@use "src/styles/Root.scss" as *;`
  to every Svelte component's `<style lang="scss">` block automatically.
- Compression (`s_COMPRESS`) is `false` by default; source maps (`s_SOURCEMAPS`) are enabled.
- Target: `es2022` for both esbuild and Rollup/Terser.

**Manifest wiring** (`system.json`):
- `"esmodules": ["index.js"]` — Foundry loads the compiled ES module from the repo root.
- `"styles": ["style.css"]` — Foundry loads the compiled CSS from the repo root.
- Document types declared: Actor (`player`, `npc`), Item (`ability`, `armor`, `commodity`, `effect`, `equipment`,
  `shield`, `spell`, `weapon`), ChatMessage (`testChat`).
- `"socket": true` enables the system socket used by `SocketManager`.
- Foundry compatibility: minimum v11, verified/maximum v13.
