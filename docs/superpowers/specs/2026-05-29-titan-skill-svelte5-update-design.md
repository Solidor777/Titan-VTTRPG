# Design: titan-codebase Skill Update for Svelte 5 + ApplicationV2

**Date:** 2026-05-29
**Status:** Approved (design) — pending spec review
**Related:** `docs/superpowers/specs/2026-05-29-svelte5-migration-design.md` (the migration itself)

## Problem

The `feature/svelte5-migration` branch was merged (commit `1bb7721c`), moving the TITAN
system from **TyphonJS runtime + Svelte 4 + Foundry v13** to **pure Svelte 5 (runes) mounted
into Foundry v14 ApplicationV2**, with no UI middleware. The `titan-codebase` skill
(`.claude/skills/titan-codebase/`) still documents the old TyphonJS stack throughout its four
reference files and `SKILL.md`. Following the skill now actively misleads: it tells the reader to
use `svelte-4` and `foundry-svelte-typhonjs`, to subscribe via `$document`, and to extend
`SvelteApplication` — none of which exist in the codebase anymore.

Two deliverables:

1. **Update the skill** so it describes the current Svelte 5 + ApplicationV2 architecture.
2. **Document the remaining Svelte 5 fixups** in a separate project doc, and apply the low-risk
   ones.

## Verified facts about the new architecture

Confirmed by reading the actual code (not assumed):

- **No TyphonJS remains.** Zero imports of `@typhonjs-fvtt/runtime`, `@typhonjs-fvtt/standard`,
  `@typhonjs-fvtt/svelte-standard`, `#runtime/`, `#standard/`, `TJSDocument`, `TJSDialog`,
  `TJSProseMirror`, or `slideFade` anywhere in `src/`. (The `@typhonjs-config/*` and
  `@typhonjs-fvtt/eslint-config-*` dev-only ESLint configs remain in `package.json` — tooling,
  not runtime.)
- **Sheets:** `TitanDocumentSheet` (`src/document/sheet/TitanDocumentSheet.js`) extends
  `foundry.applications.api.DocumentSheetV2`. It mounts the Svelte tree with Svelte 5 `mount()`
  (from `'svelte'`) inside `_replaceHTML()` on first render only (`options.isFirstRender`), and
  tears it down with `unmount(handle, { outro: true })` in `_onClose()`. `_renderHTML()` returns
  `{}`. The inner shell component is supplied by the per-type subclass via
  `this.options.svelte.props.shell`.
- **Dialogs:** `TitanDialog` (`src/helpers/dialogs/Dialog.js`) extends
  `foundry.applications.api.ApplicationV2`. Constructed with `options.content = { class, props }`;
  it strips `content` off the options, calls `super(options)`, and mounts `content.class` with
  `content.props` via `mount()` in `_replaceHTML()` (first render), unmounting in `_onClose()`.
  Check dialogs (e.g. `AttributeCheckDialog`) still pass `writable()` stores
  (`checkOptions`, `checkParameters`) as props, distributed to children via `setContext`.
- **Reactivity bridge — `ReactiveDocument`** (`src/document/reactive/ReactiveDocument.svelte.js`,
  NEW): a plain class wrapping the live Foundry document. Its `.data` getter calls a
  `createSubscriber()` (from `'svelte/reactivity'`) subscriber and returns the live document, so
  reading `document.data.system.x` inside a component or `$derived` re-runs on change. The
  subscriber registers `update<DocumentName>` plus embedded `create/update/deleteItem` and
  `create/update/deleteActiveEffect` hooks, and tears them down automatically when the last
  reactive reader unsubscribes (on unmount). `.destroy()` is a retained no-op. Because `.data` is
  the live document, reads (`.data.system.x`), writes (`.data.update(...)`), collections
  (`.data.items`), and methods all go through the same accessor.
- **Context convention:** `DocumentSheetShell.svelte` receives `{ document, applicationState, shell }`
  as `$props()` and sets `document` (the `ReactiveDocument` bridge) and `applicationState` into
  context. Every descendant reads `const document = getContext('document')` then `document.data.*`.
  The old `$document` store-subscription syntax is gone (swept out across all of `src/`).
- **`applicationState`:** still a Svelte `writable()` store factory
  (`createCharacterSheetState`, item sheet state, etc.) — intentionally not converted to runes,
  passed via context, consumed with `$appState` / `.update()`.
- **Write-back:** `refreshSystemDocument(document, disabled)`
  (`src/helpers/utility-functions/RefreshSystemDocumentData.js`) now guards on
  `!disabled && document?.isOwner` and runs
  `document.update({ system: structuredClone(document.system), flags: structuredClone(document.flags) })`.
  Callers pass `document.data`. Direct `item.update({ system: {...} })` rows also still exist.
- **Dynamic component dispatch:** `<svelte:component this={...}>` is gone. Shells use
  `{#if shell}{@const Shell = shell}<Shell />{/if}` (and `{#each [Component] as Comp}<Comp/>{/each}`
  for nested dynamic components). `ChatMessageShell.svelte` selects via a type→component map and
  renders the chosen class with `{@const}`.
- **Chat render:** `OnRenderChatMessageHTML.js` listens on `renderChatMessageHTML` (Foundry v13+).
  For a Titan-flagged message it builds a `new ReactiveDocument(message)` bridge and `mount()`s
  `ChatMessageShell` into `.message-content` with `props: { documentStore: bridge }`, storing
  `message._svelteComponent = { handle, bridge }` for teardown in `OnPreDeleteChatMessage.js`.
- **Transitions:** Svelte built-ins from `'svelte/transition'` (`slide`, `fade`), e.g.
  `TagContainer.svelte`.
- **Rich text:** `ProseMirrorEditor.svelte` uses Foundry's native
  `foundry.applications.elements.HTMLProseMirrorElement.create(...)`; `DocumentBoundEditorInput`
  / `DocumentEditorInput` delegate to it.
- **Manifest/build:** `system.json` compatibility minimum 13 / verified 14 / maximum 14;
  new `grid` block (`units: "sp"`, `diagonals: 4`). `package.json` has `svelte ^5.0.0` and
  `@sveltejs/vite-plugin-svelte ^4.0.0`. **`@league-of-foundry-developers/foundry-vtt-types` is
  still `^13.x`** while the system targets v14 — a known type-package/runtime version mismatch.
  `vite.config.mjs` adds a `$fonts/` alias alongside `~/`.

## Approach

**Surgical edits** (chosen over full rewrite): rewrite only the TyphonJS-specific sections in each
skill file; preserve the verified-accurate content (data-model hierarchy, checks, rules elements,
migration, combat/turn flow). `ReactiveDocument` + the `mount()` lifecycle is documented inline in
each file where it's relevant rather than as a standalone section. Lowest regression risk, smallest
review diff, matches the skill's "verified against actual code" bar.

The fixups list lives in a **separate project doc** (not in the skill), because outstanding TODOs
are transient and fail the skill's "durable codebase fact" test. Low-risk fixups are **applied**.

## Changes

### A. `SKILL.md`

- **Stack at a glance:** replace the TyphonJS/Svelte-4/v13 bullets with: pure Svelte 5 (runes)
  mounted into Foundry v14 ApplicationV2, no UI middleware; Foundry v14 (note `foundry-vtt-types`
  is still v13 — version mismatch); Vite 5; `src/` → repo-root build. Remove the `#runtime/*` /
  `#standard/*` import-map paragraph; keep `~/` (and add `$fonts/`).
- **Sibling skills:** `foundry-svelte-typhonjs` → **`foundry-svelte`**; `svelte-4` → **`svelte-5`**.
  Invert the final warning line so `foundry-svelte-typhonjs` and `svelte-4` are now the ones that
  do **not** apply.
- **High-level architecture** (3rd paragraph): rewrite the sheet sentence —
  `SvelteApplication`/`TJSDocument`/`ApplicationShell`/`<svelte:component>` →
  `DocumentSheetV2` + Svelte 5 `mount()` + `ReactiveDocument` bridge +
  `getContext('document')`/`document.data`. Update the chat-render sentence (`TJSDocument` →
  `ReactiveDocument`).

### B. `references/conventions.md`

- **Import maps:** delete `#runtime`/`#standard` content; state no TyphonJS packages remain at
  runtime. Keep `~/`; add `$fonts/`.
- **Rename "TyphonJS patterns in use" → "Application & reactivity patterns."** New content:
  - `DocumentSheetV2`/`ApplicationV2` base; `mount()`/`unmount()` in `_replaceHTML`
    (first-render-only) / `_onClose`.
  - `ReactiveDocument` bridge: `createSubscriber`, `.data` live-doc accessor, registered hooks,
    auto-teardown; `getContext('document')` → `document.data.system.*` convention.
  - Dialogs: `TitanDialog extends ApplicationV2`, `content: { class, props }`; check dialogs still
    pass `writable` stores via context.
  - Dynamic dispatch via `{@const C = …}<C/>`, not `<svelte:component>`.
  - Transitions from `'svelte/transition'`.
- **Styling** section: unchanged.
- **Delete** the `svelte:options accessors={true}` gotcha (removed in migration).
- **Svelte context protocol** gotcha: `$document` → `document.data`.

### C. `references/abstractions.md` — Sheets section only

Rewrite the "Base layer" bullets to `DocumentSheetV2`, the `ReactiveDocument` bridge +
`applicationState`, Svelte 5 `mount()` of `DocumentSheetShell.svelte`, and `{@const}`-based shell
rendering. Per-type hierarchy and "mounts its own `*SheetShell.svelte`" lines stay. Everything
else in the file is unchanged.

### D. `references/data-flow.md`

- **Sheet render lifecycle** (steps 1–7): rewrite to ApplicationV2 construction
  (`super({ document })`, build `ReactiveDocument`, `_createReactiveState`), `_replaceHTML`
  first-render `mount()`, context wiring, `document.data` reactivity via `createSubscriber`,
  `_onClose` `unmount`. Keep the write-back patterns (note `refreshSystemDocument` now guards
  `document.isOwner`) and the direct-`item.update` pattern.
- **Check end-to-end:** step 2 (dialog) — `TJSDialog` → `ApplicationV2` + `mount`, note the
  inner shell's reactive recompute; step 6 (chat render) — `TJSDocument` → `ReactiveDocument`
  bridge passed as `props.documentStore`, `<svelte:component>` → `{@const}`.
- Migration and combat/turn-flow sections: unchanged.

### E. Fixups tracker doc — `docs/superpowers/plans/2026-05-29-svelte5-remaining-fixups.md`

Matches the existing `docs/superpowers/plans/` migration-phase convention. Sections:

- **Status:** migration functionally complete; no TyphonJS remnants; only minor idiom cleanups and
  one a11y debt item outstanding.
- **(a) Apply now (low-risk):**
  - `on:click` → `onclick` in `ActorSheetEditTokenButton.svelte`,
    `ActorSheetImportActorButton.svelte`, `ActorSheetToggleLinkedTokenButton.svelte`,
    `ActorSheetUnlinkTokenButton.svelte`.
  - `$:` block → `$derived.by(...)` in
    `CharacterSheetSkillsList.svelte` (~line 17) and `SpellSheetCustomAspectsTab.svelte` (~line 21).
  - Add localized `aria-label` to the two icon `<a>` elements in `EditDeleteTag.svelte` and the
    icon `<button>` in `IconButton.svelte`; remove the now-unneeded a11y `svelte-ignore` lines.
- **(b) Accepted debt (no action):**
  - ~21 `svelte-ignore state_referenced_locally` on intentional, lifetime-stable `setContext`
    captures — justified; documented rather than suppressed-silently.
  - ~7 `svelte-ignore missing-declaration` on the Foundry `game` global in chat-message templates
    — pragmatic; could be resolved with a typed global but not worth churn.

Items in (a) are checked off as the code fixes land (deliverable F).

### F. Apply the low-risk code fixups

Exactly the (a) items above. Then run `npm run eslint` and `npm run stylelint` and confirm clean
output before claiming completion. All edits follow `.claude/CLAUDE.md` style rules (120-col wrap,
typed/commented declarations, multiline Svelte components with >1 prop, no `:global`).

## Out of scope

- Changing the `foundry-vtt-types` dependency version (documented as a known mismatch only).
- Touching the accepted-debt suppressions in (b).
- Any behavioral/runtime change to the system; this is documentation + mechanical idiom cleanup.

## Verification

- Skill files: re-read after editing; no remaining `TyphonJS`, `TJSDocument`, `SvelteApplication`,
  `$document`, `svelte:component`, `#runtime`, or `slideFade` references except where explicitly
  describing what was removed.
- Code fixups: `npm run eslint` + `npm run stylelint` clean; grep confirms the targeted `on:click`
  and `$:` occurrences are gone and the touched a11y `svelte-ignore` lines are removed.
