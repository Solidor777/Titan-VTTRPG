# Svelte 5 Migration — Design Spec

**Date:** 2026-05-29
**Branch:** `feature/svelte5-migration`
**Working tree:** `C:\FoundryVTT\V14\dev\foundryuserdata\Data\systems\titan` (separate clone of `Solidor777/Titan-VTTRPG`)
**Target:** Foundry **v14** ApplicationV2
**Reactivity model:** Svelte 5 runes (`$state` / `$derived`)
**Sequencing:** Horizontal by layer (infra → primitives → bulk)

---

## 1. Goal & decision

TITAN is intended to be long-lived and track Foundry v14/v15+. The current UI stack —
`@typhonjs-fvtt/runtime` **0.3.0-next.4** (a pre-release) on **Svelte 4** — rests on
`SvelteApplication`, which extends Foundry's **deprecated AppV1 `Application`** base class. On a
long horizon this is a liability: AppV1 will be removed in a future Foundry major, the runtime is a
single-maintainer pre-release in the critical path, and the Svelte 4→5 component rewrite is
unavoidable regardless of when it happens.

**Decision:** Remove TyphonJS and migrate to **pure Svelte 5 mounted on ApplicationV2**, executed
as a planned, staged project on an isolated branch so the live v13 system keeps running throughout.

## 2. Audit baseline (as of 2026-05-29)

**TyphonJS API surface — small and concentrated (8 import sites, 7 files):**

| TyphonJS API | Location | Role |
|---|---|---|
| `SvelteApplication` | `src/document/sheet/TitanDocumentSheet.js` | Base class for every sheet |
| `TJSDocument` | `TitanDocumentSheet.js`, `src/hooks/OnRenderChatMessageHTML.js` | Reactive `$document` store |
| `ApplicationShell` | `src/document/sheet/DocumentSheetShell.svelte` | Window chrome |
| `TJSDialog` | `src/helpers/dialogs/Dialog.js` | Base for all check dialogs |
| `TJSProseMirror` | `DocumentEditorInput.svelte`, `DocumentBoundEditorInput.svelte` | Rich-text editing |
| `slideFade` | `.../character/sheet/tabs/skills/CharacterSheetSkillsList.svelte` | One list transition |

**Svelte 4 idiom surface — large (across 417 `.svelte` files):**

| Idiom | Files | Occurrences |
|---|---|---|
| `export let` | 237 | 582 |
| `on:` event directives | 194 | — |
| `$:` reactive blocks | 48 | 55 |
| `<slot>` | 23 | — |
| `<svelte:component>` | 23 | — |
| `createEventDispatcher` | 5 | — |
| `get/setContext` | 237 | — |
| `svelte:options accessors` | 13 | — |
| `let:` slot props | 0 | 0 |

The TyphonJS decoupling is cheap (7 files); the cost driver is the 417-component Svelte 4→5 rewrite,
which is highly patterned and batchable.

## 3. Environment & repo wiring

- The v14 system lives in a **separate clone** at
  `C:\FoundryVTT\V14\dev\foundryuserdata\Data\systems\titan`, on `feature/svelte5-migration`.
- `origin` points at GitHub (`Solidor777/Titan-VTTRPG`). The v13 tree
  (`C:\FoundryVTT\V13\Dev\foundryuserdata\Data\systems\titan`) is fully decoupled and continues on
  `development`.
- **Integration model:** later merge-back via remote — push `feature/svelte5-migration` and open a
  PR (or fetch/merge). The branch is held local until there is something worth sharing.
- **Run v14 dev instance:** `cd C:\FoundryVTT\V14\dev` then
  `node foundry/main.js --dataPath=/foundryvtt/V14/dev/foundryuserdata`.
- `npm install` (Svelte 5 deps) runs in the clone during implementation.

## 4. Architecture — what replaces what

| Today (TyphonJS + Svelte 4) | After (pure Svelte 5 + v14 AppV2) |
|---|---|
| `TitanDocumentSheet extends SvelteApplication` (AppV1) | `extends foundry.applications.api.DocumentSheetV2`; mounts via `_renderHTML`/`_replaceHTML`, tears down in `_onClose` |
| `ApplicationShell` window chrome | AppV2 renders its own window frame; Svelte mounts into the content `HTMLElement` |
| `DocumentSheetShell.svelte` + `<svelte:component this={shell}/>` | Thin Svelte 5 root rendering the type shell as a dynamic component; no `svelte:options accessors` |
| `TJSDocument` + `$document` | `ReactiveDocument` bridge (`.svelte.js`): `$state` snapshot refreshed from `update*` hooks via `createSubscriber`, exposed through context |
| `TitanDialog extends TJSDialog` | `TitanDialog extends ApplicationV2` (Svelte-mounted), or `DialogV2` for simple prompts; check dialogs pass runes state instead of `writable` stores |
| `TJSProseMirror` | Svelte wrapper around Foundry's native `<prose-mirror>` element |
| `slideFade` | Svelte built-in `slide` / `fade` |
| `@typhonjs-fvtt/runtime/rollup` postcss + terser in Vite | Standalone `postcss` + `autoprefixer` config |

**Rune-file rule:** runes used outside `.svelte` components must live in `.svelte.js` files. The
reactivity bridge is therefore `ReactiveDocument.svelte.js`. Sheet/application *classes* stay plain
`.js` — they hold a bridge instance but do not use runes directly.

**The mount seam (verified identical v13↔v14):** `ApplicationV2` calls `_renderHTML(context,
options)` (async; returns an opaque value) then `_replaceHTML(result, content, options)` (sync;
`content` is the target `HTMLElement`, `options.isFirstRender` gates first mount). Svelte's
`mount()`/`unmount()` (imported from `"svelte"`) wire into these; `unmount(handle, { outro: true })`
runs synchronously in `_onClose`.

## 5. Reactivity bridge (load-bearing)

A single reusable `ReactiveDocument` class, scoped per document id:

```js
// src/document/reactive/ReactiveDocument.svelte.js
import { createSubscriber } from 'svelte/reactivity';

export default class ReactiveDocument {
   #snapshot = $state({});
   #subscribe;

   constructor(doc) {
      this.doc = doc;                                   // live document = source of truth for writes
      Object.assign(this.#snapshot, this.#capture());   // seed so components never read an empty object
      this.#subscribe = createSubscriber((update) => {
         const ids = [
            Hooks.on(`update${doc.documentName}`, (d, _diff, o) => this.#refresh(d, o, update)),
            // actors additionally listen to embedded create/update/deleteItem + ActiveEffect CRUD,
            // each scoped by parent id.
         ];
         return () => ids.forEach((id) => { /* Hooks.off for each registered hook */ });
      });
   }

   /** Read inside a component or $derived to opt in to reactivity. */
   get data() { this.#subscribe(); return this.#snapshot; }

   #refresh(changed, options, update) {
      if (options?.diff === false) { return; }
      if (changed?.id !== this.doc.id) { return; }
      Object.assign(this.#snapshot, this.#capture());
      update();
   }

   #capture() {
      return {
         name: this.doc.name,
         system: foundry.utils.deepClone(this.doc.system),  // derived data is present at read time
         // items/effects snapshotted for actors
      };
   }
}
```

- **Context protocol preserved:** components still `getContext('document')`. Only the read shape
  changes: `$document.system.foo` → `doc.data.system.foo` (used inside `$derived`).
- **Derived data:** `doc.system` already holds the rules-element-derived values at read time, so the
  snapshot captures TITAN's heavy `prepareDerivedData` output correctly.
- **Writes:** through `doc.update({ 'system.path': value })`, in event handlers — never by mutating
  the snapshot. The whole-blob `refreshSystemDocument` helper is retired in favor of targeted
  updates. Document-bound inputs adopt a **local-`$state` bound to `value` + `onchange` →
  `doc.update()`** pattern (you cannot `bind:` to a read-only `$derived`).
- **Loop safety:** writes live in handlers, not `$effect`; use `$state.raw` for guard flags if a
  guarded effect is ever unavoidable.

## 6. Component transform catalog (all 417)

Mechanical, repeated, batchable:

| From | To | Files |
|---|---|---|
| `export let x` | `let { x } = $props()` | 237 |
| `on:click={fn}` | `onclick={fn}` | 194 |
| `$: y = …` | `let y = $derived(…)` / `$effect` | 48 |
| `<slot>` / named slots | `{#snippet}` + `{@render}` | 23 |
| `<svelte:component this={C}/>` | `<C />` (dynamic by default) | 23 |
| `createEventDispatcher` | callback props | 5 |
| `$document.system.x` | `doc.data.system.x` via bridge | ~237 |
| `svelte:options accessors` | removed | 13 |

## 7. TITAN-specific integration points (non-mechanical)

- **Header buttons** — `TitanDocumentSheet._getHeaderButtons` mounts `ConfigureSheetButton.svelte`
  (TJS-specific). AppV2 uses `_getHeaderControls()` (icon + label + action entries). The configure
  button becomes an AppV2 header control with an action handler.
- **Drag/drop** — TJS `_canDragStart` / `_canDragDrop` + `dragDrop` option → AppV2 `DragDrop`
  handler registration in `DEFAULT_OPTIONS`.
- **Chat-message mount** (`src/hooks/OnRenderChatMessageHTML.js`) — not an Application; a direct
  mount into `.message-content`. Replace the `TJSDocument` wrap with `mount(ChatMessageShell,
  { target, props })` plus a `ReactiveDocument` for the message (report confirm/apply buttons mutate
  `flags.titan`, so it needs `updateChatMessage` reactivity). Teardown on chat-message delete.
- **Check dialogs** — `checkOptions` / `checkParameters` `writable` stores → a runes state object
  passed as props; the `$:` recompute (`getAttributeCheckParameters`) → `$derived`.

## 8. Build config changes

- **`package.json`:** add `svelte ^5`, `@sveltejs/vite-plugin-svelte ^5`; remove
  `@typhonjs-fvtt/runtime`, `@typhonjs-fvtt/standard`, `@typhonjs-fvtt/svelte-standard`, and the
  `#runtime` / `#standard` import maps. Keep `svelte-preprocess` (the `Root.scss` prepend stays).
- **`vite.config.mjs`:** replace `postcssConfig` / `terserConfig` from
  `@typhonjs-fvtt/runtime/rollup` with direct `autoprefixer` + terser. Everything else (root `src/`,
  `~/` alias, ES output to repo root, dev-server proxy) is unchanged.
- **`system.json`:** raise `compatibility` to v14.

## 9. Staging plan (horizontal, with an early gate)

1. **Infra layer** — `ReactiveDocument.svelte.js`; the AppV2 sheet base (`TitanDocumentSheet`);
   dialog base; `<prose-mirror>` wrapper; transition swap; build config. No components converted.
2. **🚦 Smoke-test gate** — convert exactly one tiny item sheet (e.g. Commodity) end-to-end and
   confirm it opens, reads, and writes in a live v14 world. Locks conventions before mass change.
   (Mitigates horizontal sequencing's "unproven until late" risk.)
3. **Shared primitives** — the ~50 `src/helpers/svelte-components/` (buttons, inputs, labels, tags,
   layout). Everything depends on these.
4. **Bulk conversion by area** — actor sheets, item sheets, check dialogs, chat/check messages,
   report components.
5. **Decommission** — remove TyphonJS deps, dead shells, `accessors`, `#runtime`/`#standard` maps.

## 10. Verification

No unit-test harness exists; verification is **behavioral in a live v14 world** at each stage:

- Open each sheet type; edit fields and confirm the write-back round-trip.
- Roll each check type (dialog → chat → apply buttons).
- Advance and revert combat turns (report messages + reactivity).
- Run a world migration.

The smoke-test gate (step 2) and per-area checks (step 4) are the checkpoints. Each phase ends with
a clean `npm run build`, `npm run eslint`, and `npm run stylelint`.

## 11. Risks & mitigations

- **AppV2 header/drag-drop API differences** — lower-level than TJS abstracted. Isolated to the base
  classes; resolved during the infra layer.
- **Snapshot cost** — `deepClone(system)` per hook fire on large actors. Mitigate by scoping hooks
  tightly by id; re-capture changed branches only if profiling shows a problem.
- **Long-lived branch divergence** — the clone diverges from ongoing `development` work. Mitigate by
  keeping conversion phases short and rebasing/merging `development` in periodically.

## 12. Out of scope

- v15+ specifics (design targets v14; the mount seam is v13/v14-identical, easing later moves).
- Behavioral/feature changes — this is a stack migration; UI behavior and layout are preserved.
- Backporting the new stack to v13.
