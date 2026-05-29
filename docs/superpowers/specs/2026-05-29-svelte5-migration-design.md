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

   /** Read inside a component or $derived to opt in to reactivity (runes-idiomatic, end-state). */
   get data() { this.#subscribe(); return this.#snapshot; }

   /**
    * TEMPORARY store-compat shim. Lets legacy ($document) components keep working through the
    * atomic cutover. Removed in the final phase once no `$document` readers remain.
    */
   subscribe(run) {
      run(this.doc);
      const id = Hooks.on(`update${this.doc.documentName}`, () => run(this.doc));
      this.#shimHooks.push(id);
      return () => Hooks.off(`update${this.doc.documentName}`, id);
   }
   destroy() { this.#shimHooks.forEach((id) => Hooks.off(`update${this.doc.documentName}`, id)); }
   #shimHooks = [];

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
- **Transition shim (temporary):** the bridge also implements Svelte's store contract
  (`subscribe`/`destroy`), so legacy components reading `$document` keep working unchanged through
  the atomic cutover. Leaf components are converted from `$document` → `doc.data` in later batches;
  the shim is deleted in the final phase. End-state remains fully runes-idiomatic.
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

- **`package.json`:** add `svelte ^5`, bump `@sveltejs/vite-plugin-svelte` `^3` → **`^4`** (v4 is the
  line that supports Svelte 5 while remaining compatible with the project's Vite 5; plugin v5 would
  force a Vite 6 bump, deliberately avoided to isolate Plan 1's risk). Remove `@typhonjs-fvtt/runtime`,
  `@typhonjs-fvtt/standard`, `@typhonjs-fvtt/svelte-standard`, and the `#runtime` / `#standard` import
  maps. Keep `svelte-preprocess` (the `Root.scss` prepend stays).
- **`vite.config.mjs`:** replace `postcssConfig` / `terserConfig` from
  `@typhonjs-fvtt/runtime/rollup` with direct `autoprefixer` + terser. Everything else (root `src/`,
  `~/` alias, ES output to repo root, dev-server proxy) is unchanged.
- **`system.json`:** raise `compatibility` to v14.

## 9. Staging plan

### Hard constraint that shapes the staging

`@typhonjs-fvtt/runtime` 0.3.0-next.4 declares `peerDependencies` of `svelte ">=4.x.x <5"` and
`@sveltejs/vite-plugin-svelte ">=3.x.x <4"` — it is **incompatible with Svelte 5 by declaration**.
Svelte's compiler version is global to a build, so there is no window where some sheets run on
TyphonJS + Svelte 4 while others run on AppV2 + Svelte 5. **Adopting Svelte 5 forces removal of all
TyphonJS in one atomic step.**

What stays gradual: Svelte 5 runs Svelte-4-syntax components in backward-compatible **legacy mode**
(`export let`, `on:`, `$:`, `<slot>`, `createEventDispatcher`, stores all keep working). Only the
Svelte-4 **imperative component API** (`new Component()`, `$destroy`, `$set`, `$on`) is hard-removed —
in TITAN that is a single site (the chat-message mount in `OnRenderChatMessageHTML.js` + its teardown
in `OnPreDeleteChatMessage.js`). The transition shim (§5) keeps `$document` readers working, so the
237-file document-read conversion is **not** dragged into the atomic step.

### Phase 1 — Foundation cutover (atomic; the only phase that must land whole)

Removes all TyphonJS and lands the new stack while leaving all 417 leaf components legacy:
`ReactiveDocument.svelte.js` (with the `subscribe`/`destroy` shim); the AppV2 sheet base
(`TitanDocumentSheet` → `DocumentSheetV2`, mount/header-controls/drag-drop); the new root shell
(replacing `DocumentSheetShell` + `ApplicationShell`); the ~14 per-type sheet classes rewired off the
`svelte: {…}` options; chat mount/unmount (`mount()`/`unmount()`); dialog base (`TitanDialog` →
AppV2); the two ProseMirror components → `<prose-mirror>`; the `slideFade` → built-in `slide` swap;
and the build config (§8) + `system.json` v14 bump. **Exit criterion:** clean `npm run build`, and in
a live v14 world every sheet opens, every check rolls, combat turns advance — all leaf components
untouched and reading through the shim. Verified Commodity-first, then across all sheet types.

### Phase 2…N — Leaf runes conversion (gradual, batched by area)

Convert leaf components from legacy → runes and from `$document` → `doc.data`, area by area
(shared `src/helpers/svelte-components/` primitives first, since everything depends on them; then
actor sheets, item sheets, check dialogs, chat/check messages, report components). The system builds
and runs after every batch. Each batch applies the §6 transform catalog.

### Final phase — Shim removal & decommission

Once no `$document` readers remain, delete the `subscribe`/`destroy` shim from `ReactiveDocument`,
remove any dead shells and `svelte:options accessors`, and confirm the `#runtime`/`#standard` import
maps and all TyphonJS deps are gone.

Each phase after Phase 1 gets its own implementation plan, written once Phase 1 locks the conventions.

## 10. Verification

No unit-test harness exists; verification is **behavioral in a live v14 world** at each stage:

- Open each sheet type; edit fields and confirm the write-back round-trip.
- Roll each check type (dialog → chat → apply buttons).
- Advance and revert combat turns (report messages + reactivity).
- Run a world migration.

The Phase 1 exit criterion (§9) and the per-batch checks in later phases are the checkpoints. Each
phase ends with a clean `npm run build`, `npm run eslint`, and `npm run stylelint`. Within the
atomic Phase 1, an intermediate red build is expected; the build must be green by the phase's end.

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
