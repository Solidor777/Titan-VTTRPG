# Conventions & Non-Obvious Facts

> Descriptive only. For the authoritative style/formatting/documentation rules, see
> `.claude/CLAUDE.md` (summarized at the bottom of this file).

## Import maps

There are no TyphonJS runtime imports in `src/` — the v14 migration removed
`@typhonjs-fvtt/runtime`, `@typhonjs-fvtt/standard`, `@typhonjs-fvtt/svelte-standard`, and the
`#runtime/*` / `#standard/*` subpath maps entirely. (The `@typhonjs-config/*` and
`@typhonjs-fvtt/eslint-config-*` packages remain in `devDependencies` as ESLint tooling only.)

Svelte and Foundry are used directly:

```js
import { mount, unmount } from 'svelte';
import { getContext, setContext } from 'svelte';
import { createSubscriber } from 'svelte/reactivity';
import { slide, fade } from 'svelte/transition';

const { DocumentSheetV2, ApplicationV2 } = foundry.applications.api;
```

The `~/` path alias (configured in `vite.config.mjs` as a Vite `resolve.alias` pointing at `src/`)
**is** used everywhere for intra-project imports; `$fonts/` aliases the repo `fonts/` directory:

```js
import assert from '~/helpers/utility-functions/Assert.js';
import localize from '~/helpers/utility-functions/Localize.js';
```

## Application & reactivity patterns

**`DocumentSheetV2` mount lifecycle** — `TitanDocumentSheet` (`src/document/sheet/TitanDocumentSheet.js`)
extends `foundry.applications.api.DocumentSheetV2`. It mounts the Svelte tree with Svelte 5's
`mount()` (from `'svelte'`) inside `_replaceHTML()` **on first render only** (`options.isFirstRender`)
and tears it down with `unmount(handle, { outro: true })` in `_onClose()`. `_renderHTML()` returns
`{}`. The per-type subclass supplies the inner shell component via `this.options.svelte.props.shell` (a plain
ApplicationV2 options object — the `svelte` key is a naming holdover, not TyphonJS middleware).
`TitanDialog` (`src/helpers/dialogs/Dialog.js`) follows the same lifecycle on a bare
`foundry.applications.api.ApplicationV2`, mounting `options.content.class` with `options.content.props`.
Its constructor hardcodes element classes `['titan', 'titan-dialog']` (plus `titan-dark-mode`); the
per-type `_getDialogClasses()` overrides on every subclass are **dead code** (the v14 `TitanDialog`
never calls that leftover de-TyphonJS hook), so per-type CSS classes like `titan-attribute-check-dialog`
never reach the DOM. The stable per-type window identifier is the element **id** prefix
`titan-<type>-check-dialog-<actorId>` (base ctor suffixes a generated UUID).

**`ReactiveDocument` bridge** — `src/document/reactive/ReactiveDocument.svelte.js` is the
Foundry↔Svelte-5 reactivity bridge (it replaces TyphonJS `TJSDocument`). It wraps the live document;
its `.data` getter calls a `createSubscriber()` (from `'svelte/reactivity'`) subscriber and returns
the **live document**, so reading `document.data.system.x` inside a component or `$derived` re-runs
when the document changes. The subscriber registers `update<DocumentName>` plus embedded
`create/update/deleteItem` and `create/update/deleteActiveEffect` hooks and tears them down
automatically when the last reactive reader unsubscribes (on unmount). Because `.data` is the live
document, reads (`.data.system.x`), writes (`.data.update(...)`), collections (`.data.items`), and
methods all go through the same accessor.

**Trait-sidebar index iteration must be numeric** — All three trait-sidebar `$derived.by` loops
(`ItemSheetSidebarTraits`, `ArmorSheetSidebarTraits`, `ShieldSheetSidebarTraits`) iterate with a
numeric `for (let idx = 0; idx < arr.length; idx++)` loop. Using `for...in` over an array yields
string keys (`"0"`, `"1"`, …), and any `const [idx]` destructuring then takes only the first
*character* of that string key — so `idx` remains a string. Downstream strict comparisons
(`idx === traitIdx`, `idx !== traitIdx`) are number-vs-string and never match, breaking edit and
delete. Never use `for...in` (or destructuring into `[idx]`) when a numeric index is required for
later comparison.

**Never mutate a live `document.system.*` array in place before `update()`** — pushing/splicing the
live array (e.g. `this.system.customTrait.push(x); this.update({ system: { customTrait: ... } })`)
defeats `ReactiveDocument` change-detection: the document persists but dependent `$derived`/sheets do
not re-render. Always build a fresh array and pass that to `update()` (e.g.
`this.update({ system: { customTrait: [...this.system.customTrait, x] } })`). This bug was fixed
across the custom-trait add/edit/delete paths on items and effects; the same antipattern still exists
in `TitanActiveEffect`'s inline-`check` add/delete paths and in `RulesElementMixin` add/delete.

**Context access convention** — `DocumentSheetShell.svelte` sets the `ReactiveDocument` bridge into
context under `'document'` and the UI-state store under `'applicationState'`. Every descendant reads:

```svelte
import { getContext } from 'svelte';
const document = getContext('document');          // ReactiveDocument bridge
const appState = getContext('applicationState');  // writable store
```

then accesses reactive data via `document.data.system.*`. There is no `$document` store
auto-subscription — that syntax was swept out across all of `src/`. `applicationState` is still a
Svelte `writable()` store (factory functions such as `createCharacterSheetState`), consumed with
`$appState` / `.update()`.

**Dialog data passing** — check dialogs (e.g. `AttributeCheckDialog`) construct with
`content: { class: CheckDialogShell, props: { shell, actor, checkOptions: writable(...),
checkParameters: writable(...) } }` and the shell distributes those stores to children via
`setContext`.

**Dynamic component dispatch** — `<svelte:component this={...}>` is gone (deprecated in Svelte 5
runes mode). Shells select a component class and render it with `{@const}`:

```svelte
{#if shell}
   {@const Shell = shell}
   <Shell />
{/if}
```

`ChatMessageShell.svelte` dispatches on `document.data.flags.titan.type` via a type→component map and
renders the chosen class the same way.

**Transitions** — Svelte built-ins from `'svelte/transition'` (`slide`, `fade`), e.g.
`<li transition:slide|local>`. The TyphonJS `slideFade` transition is no longer used.

**Rich text** — `ProseMirrorEditor.svelte` (`src/helpers/svelte-components/editor/`) wraps Foundry's
native `foundry.applications.elements.HTMLProseMirrorElement`; `DocumentBoundEditorInput.svelte` and
`DocumentEditorInput.svelte` delegate to it (TyphonJS `TJSProseMirror` is gone). The wrapper runs the
element in **toggled** mode (`toggled = true` by default): it shows enriched HTML with a hover-revealed
pencil edit button (owner only, via core CSS) and shows the formatting toolbar only while editing. The
two input wrappers compute `enriched` reactively with
`foundry.applications.ux.TextEditor.implementation.enrichHTML(value, { secrets: isOwner, relativeTo:
doc })` and pass `enriched` plus `documentUUID={doc.uuid}` so content links/relative UUIDs resolve.
Because the `<prose-mirror>` element is appended at runtime (`container.appendChild`) it never receives
Svelte's scoping attribute, so its fill is set with an **inline JS style** (`editor.style.flex = '1'`
only — never zero its `min-height`, which would drop Foundry's 150px floor and collapse it) over a
single fill container (`flex-column` + `align-items: stretch` + `flex: 1 1 auto` + `min-height: 0`);
scoped CSS cannot target the element and `:global` is forbidden. The two input wrappers
(`DocumentBoundEditorInput`/`DocumentEditorInput`) render `ProseMirrorEditor` as their root — they no
longer wrap it in their own `.editor` div; instead they pass `tooltip` and `notOwner={!isOwner}`, and
`ProseMirrorEditor`'s single container div carries the tooltip (`use:tooltipAction`) and the
`not-owner` class. Foundry captures the toggled element's enriched HTML once at construction and
`save()` → `_refresh()` repaints the inactive view from that snapshot, so the wrapper **rebuilds the
element when `enriched` changes while inactive** (guarded by `classList.contains('active')`) to avoid
stale rendered content; rebuilds never write `value`, so they do not loop with the persist effect.

## Styling

SCSS mixins are the deliberate, preferred styling mechanism — a codebase-wide refactor replaced all
`:global` selector usage with mixins, and no `:global` occurrences remain in `src/`.

**Icon-button resets must not force `font-weight`** — `EditDeleteTag.svelte`'s `.tag button { ... }`
block resets native button chrome (appearance, background, border, margin, padding, color, font-size,
line-height, cursor) but intentionally omits `font-weight`. The `.tag button` selector has specificity
0,1,1, which beats FontAwesome's `.fas` rule (0,1,0), so including `font-weight: inherit` overrides
FA's required `font-weight: 900` and causes solid glyphs (`fa-pen-to-square`, `fa-trash`) to render
as the notdef box. The same applies to `font-family`: both must be left unset in button resets that
sit inside FontAwesome icon button contexts.

**Where mixins live:** `src/styles/Mixins/` contains per-domain files (see `architecture.md`,
`src/styles/` section, for the full mixin file list).

**`Root.scss`** (`src/styles/Root.scss`) `@forward`s all mixin files in `src/styles/Mixins/` plus
`Variables.scss`. It is auto-prepended into every Svelte component's `<style lang="scss">` block by `svelte-preprocess`
(`prependData: '@use "src/styles/Root.scss" as *;'` in `vite.config.mjs`). This means component style blocks
can call any mixin directly without an explicit `@use`, e.g.:

```scss
<style lang="scss">
.row {
   @include flex-row;
   @include panel-1;
}
</style>
```

See `architecture.md` — `src/styles/` section — for the full list of global SCSS files.

## assert()

`assert` is a standalone default export from `src/helpers/utility-functions/Assert.js`, imported with the
`~/` alias:

```js
import assert from '~/helpers/utility-functions/Assert.js';
```

It wraps `console.assert` and also fires a Foundry UI error notification (`ui.notifications.error`) prefixed
with `"TITAN | "`. It returns the boolean result so callers can use it in a guard:

```js
if (assert(someCondition, 'Error message')) { ... }
```

`game.titan` (registered during the `init` hook in `src/hooks/OnceInit.js`) exposes the full namespace
`{ macros, assert, warn, log, error, socketManager }` — so `game.titan.assert` does exist and is the same
underlying function. Throughout the codebase the convention is to prefer the locally-imported form over the
`game.titan.*` accessors (see `CLAUDE.md`).

## v14 hook names and ContextMenuEntry shape

**Directory context-menu hooks** — In v14, `DocumentDirectory._createContextMenus()` fires
`get${documentName}ContextOptions` (e.g. `getActorContextOptions`, `getItemContextOptions`). The old
v13 names (`getActorDirectoryEntryContext`, `getItemDirectoryEntryContext`) no longer fire.
Hook signature: `(application: ApplicationV2, menuItems: ContextMenuEntry[])`.

**Chat context-menu hook** — `getChatMessageContextOptions` (was `getChatLogEntryContext` in v13).
Hook signature: `(application: ApplicationV2, menuItems: ContextMenuEntry[])`.

**Journal render hooks** — `renderJournalEntrySheet` (was `renderJournalSheet`) and
`renderJournalEntryPageProseMirrorSheet` (was `renderJournalTextPageSheet`). Both follow the standard
AppV2 render hook signature: `(application, element: HTMLElement, context, options)`.

**ContextMenuEntry shape (v14)** — `{ label, icon, visible(li: HTMLElement), onClick(event, li: HTMLElement) }`.
The old v13 shape used `name`, `condition`, and `callback(entry)` (one argument); v14 renames them to
`label` / `visible` / `onClick` (passing two arguments to `onClick`). The v13 names still work via a
deprecation shim (removed in v16); TITAN's hooks use the v14 names. Directory entry `li` elements carry `li.dataset.entryId`; chat message
`li` elements carry `li.dataset.messageId` (confirmed in `document-directory.mjs` line 237 and
`chat.mjs` line 338). `li.closest('[data-entry-id]')?.dataset.entryId` is the safe accessor pattern
(same as used in `_getEntryContextOptions` at `document-directory.mjs:237`).

**AppV2 header controls (no `_getHeaderButtons`)** — v14 `ApplicationV2` has no `_getHeaderButtons`;
sheet header actions are returned from `_getHeaderControls()` (runs on every frame render). Each entry
is `{ action, icon, label, onClick?, visible?, ownership? }` (`ApplicationHeaderControlsEntry` =
`ContextMenuEntry` + `action`). Controls render **in the header controls dropdown** opened by the
ellipsis button (`button[data-action="toggleControls"]`), as `#context-menu li.context-item` rows
(icon `<i>` + label `<span>`) — NOT inline in the header (`_renderHeaderControl` is unused in v14 core;
inline buttons would require `_getFrameButtons`). The menu entry shows only icon + label (no tooltip
field), and the label runs through core `_loc` (pass already-localized text). Click dispatch: if
`onClick` is a function it is called directly; otherwise the `action` string is looked up in
`options.actions`. TITAN sheets (`TitanActorSheet`, `TitanItemSheet`) use `onClick` arrow functions
bound to the sheet instance so dynamic per-render entries (the actor link/unlink control) need no
static `actions` map. To refresh a dynamic control's icon/label after a state change, call
`this.render({ parts: [] })` (re-renders the frame without re-running the Svelte mount).

## v14 API breakpoints (confirmed against live Foundry source)

- **`ChatMessage` style field** — In v14, `ChatMessage.type` is a string `DocumentTypeField` (subtype, default
  `"base"`). The numeric render style (`CONST.CHAT_MESSAGE_STYLES.*`) moved to a separate `style` NumberField.
  All four TITAN `ChatMessage.create()` call sites (`Check.js`, `TitanActiveEffect.js`,
  `CharacterDataModel._whisperOwners`, `TitanItem.js`) use `style: CONST.CHAT_MESSAGE_STYLES.OTHER`.

- **`TextEditor.enrichHTML` is always async in v14** — The `async: false` option was removed; the method is
  declared `static async` and always returns a `Promise<string>`. The canonical call pattern is
  `foundry.applications.ux.TextEditor.implementation.enrichHTML(value, { secrets: true })`. `RichText.svelte`
  populates a `$state('')` variable from a `$effect` that awaits this promise (with a cancellation guard).

- **`FilePicker` constructor** — use `new foundry.applications.apps.FilePicker.implementation({...})` (honors
  `CONFIG.ux` override); `new foundry.applications.apps.FilePicker({...})` is not the canonical v14 path.

- **AppV2 position width** — `ApplicationV2` instances have no `options.width`; the current rendered width lives
  on `application.position.width`. (`options.width` yields `undefined`, producing `NaN` in arithmetic.)

- **Status-effect icon field** — v14 `CONFIG.statusEffects` entries use `img` (not `icon`). Token HUD reads
  `status.img`; the v13 `icon` fallback was removed. All entries in `src/system/Conditions.js` use `img:`.

## Other gotchas

- **`localize()` wrapper** — All i18n calls go through `src/helpers/utility-functions/Localize.js` rather than
  calling `game.i18n.localize` directly. It automatically prepends `"LOCAL."` and appends `".text"` to the key,
  so `localize('attackCheck')` resolves to `game.i18n.localize('LOCAL.attackCheck.text')`.

- **`~/` alias vs relative paths** — The codebase uses the `~/` alias for cross-directory imports;
  relative paths (`./`, `../`) appear only within the same immediate directory.

- **Svelte context protocol** — Three keys are set into Svelte context at mount time:
  - `'document'` (`ReactiveDocument` bridge) and `'applicationState'` (writable store) are set by
    `DocumentSheetShell.svelte`; all sheet descendant components access them via `getContext`.
  - `'application'` (the owning `ApplicationV2` / `DocumentSheetV2` instance) is set at the `mount()` call
    site in both `TitanDocumentSheet._replaceHTML` and `TitanDialog._replaceHTML`. All components (sheet,
    dialog, and their descendants) can call `getApplication()` (`~/helpers/utility-functions/GetApplication.js`)
    which reads `getContext('application')`; it returns `undefined` when mounted without an application context
    (e.g. chat messages). The obsolete TyphonJS `getContext('#external').application` pattern has been removed.
  Read reactive data via `document.data.*` (not `$document`); context values are never passed as props down
  the tree.

- **Build output goes to the repo root** — `vite.config.mjs` sets `build.outDir` to the project root
  (`__dirname`), not a `dist/` folder. Source lives in `src/`; build artifacts such as `index.js` land at the
  top level. See `architecture.md` for the full directory layout.
- **CSS must be emitted as `style.css`** — `system.json` (`styles: ["style.css"]`) and the dev-server proxy
  both reference `style.css`, so `build.lib.cssFileName` is pinned to `'style'`. Without it the Vite 8 lib
  build names the CSS after `lib.fileName` (`index` → `index.css`), which Foundry never loads — CSS-only
  changes then build cleanly but silently fail to deploy while JS changes still apply.

## Test infrastructure

**Vitest harness** — `vitest.config.mjs` (project root) configures Vitest 2 with `happy-dom`, Svelte 5
(`@sveltejs/vite-plugin-svelte` with `hot: false`), `svelte-preprocess` (same SCSS `prependData` as
`vite.config.mjs`), and the `~/` / `$fonts/` aliases. Tests live in `tests/unit/**/*.test.js`; there is NO
test code under `src/`.

**Foundry globals mock** — `tests/setup.js` (loaded as Vitest `setupFiles`) installs:
- `globalThis.foundry = { abstract: { Document: MockDocument }, utils: { mergeObject } }` — a minimal
  `foundry.abstract.Document` stub (for `instanceof` checks) and a recursive `mergeObject` plain-object
  merge.
- `globalThis.Hooks` — a `HooksMock` instance reinstalled fresh `beforeEach` test so hook registrations
  never leak across tests. Supports `on(name, fn)`, `off(name, fn)`, and `call(name, ...args)`.

**`data-testid` convention** — Stable E2E selectors are wired via `testId` props on shared dialog
wrappers. `CheckDialogField` (`src/check/dialog/CheckDialogField.svelte`) forwards its `testId` prop
to the wrapper `<div class="field" data-testid={testId}>`. `CheckDialogSummary` forwards `testId` to
the inner `<div class="tag" data-testid={testId}>`. `CheckDialogBase` passes `testId={'check-dialog-roll'}` and
`testId={'check-dialog-cancel'}` to the two `Button` components. Each of the 16 concrete `CheckDialogField`
users and 2 `CheckDialogSummary` users supplies a static string literal such as `testId={'check-field-attribute'}` or
`testId={'check-summary-totalDice'}`. Playwright specs select these with `page.locator('[data-testid="..."]')`.

**Playwright E2E** — `npm run test:e2e` runs `playwright test` against a running Foundry world
(`playwright.config.mjs`, `baseURL: http://localhost:30000`; env `FOUNDRY_USER` / optional
`FOUNDRY_PASSWORD`). Specs live in `tests/e2e/`: `render-smoke.spec.js` (renders every document type's
sheet, asserts zero uncaught page errors), `interaction-rolls.spec.js` (each `roll<Type>Check` posts a
chat message of the expected `flags.titan.type` and the card renders), and `interaction-dialogs.spec.js`
(check/confirm/trait/edit-UUID dialogs mount). `tests/e2e/fixtures.js` provides `login`, `renderSheet`,
and `ensureDocument` (creates missing world fixtures). Drives the real built system at the repo root, so
it catches v14 API breaks that the mocked Vitest tier cannot.

**npm scripts** — `npm test` runs `vitest run` (single pass); `npm run test:watch` runs Vitest in watch
mode; `npm run test:e2e` runs the Playwright suite above.

**Logic layer — Playwright + fast-check** — The in-client logic tier uses Playwright `page.evaluate`
calls against the live v14 runtime (no external module dependency). Property-based tests inject the
`fast-check` library as the `fc` page global and drive data-model operations directly in the running
Foundry world. Quench 0.10.0 was **removed** because its `runBatches` executes 0 tests under Foundry
v14: the async-`describe` / ApplicationV2 timing mismatch causes all batch registrations to be skipped
silently. `src/quench/` and `tests/e2e/quench-runner.spec.js` were deleted; the `test:e2e:quench` npm
script was removed. No Quench code remains in `src/` or `tests/`.

**Derived-data (rules-element) E2E spec** — `tests/e2e/logic/rules-elements.spec.js` asserts the live
flatModifier pipeline: creates a fresh `player` actor (Body base = 1), attaches an `ability` item carrying
a `+2 flatModifier` rules element via `buildFlatModifierAbilityData`, waits 100 ms for derived-data
preparation to settle, and asserts `actor.system.attribute.body.value === 3`. Abilities apply their
rules elements on mere ownership (no equip), making them the canonical fixture type for derived-stat
assertions. The spec uses `test.afterEach` to delete the fixture actor so world state does not accumulate.

**`buildFlatModifierAbilityData` builder** — `tests/shared/builders.js` exports `buildFlatModifierAbilityData(name, values)`:
accepts a `string` name and a `number[]` of modifier values; returns an `Item.create` payload of type `'ability'`
with one flatModifier rules element per value, each targeting `selector: 'attribute'`, `key: 'body'`, and
`uuid: 'e2e-flatmod-{index}'`. The companion Vitest unit test lives in `tests/unit/builders.test.js`.

## Style rules live in CLAUDE.md

`.claude/CLAUDE.md` is the single authority for all code-style, formatting, and documentation rules for this
project — covering the 120-character wrap limit, multiline formatting for objects/arrays/Svelte components,
strict typing requirements, JSDoc conventions, and comment grammar rules. This skill file does not restate
those rules; read `.claude/CLAUDE.md` before writing or reviewing any code in this codebase.
