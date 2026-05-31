# Fix: ProseMirror editor broken on sheet description/notes tabs

**Date:** 2026-05-30
**Type:** Bug fix (regression from the `TJSProseMirror` → native `<prose-mirror>` refactor, commits `3951fc16` / `0c2acdad` / `1d242ac5`)
**Target behavior (user-confirmed):** Toggled + enriched — show the rendered description, reveal a pencil edit button on hover, click to edit; the formatting toolbar appears only while editing.

## Symptoms

1. **No edit button** on item-sheet description tabs.
2. The editor **toolbar ("header") renders centered in the middle of the tab** instead of filling it top-to-bottom.

## Root cause (verified)

The Svelte wrapper hosts Foundry's native `<prose-mirror>` element incorrectly:

1. **`toggled` is never enabled.** `ProseMirrorEditor.svelte` defaults `toggled = false` and the two
   input wrappers never pass it. Foundry only *creates* the `fa-edit` button when toggled
   (`client/applications/elements/prosemirror-editor.mjs:150`), and a non-toggled editor is forced
   permanently active (`_activateListeners`). → no button + always-on editor.
2. **The wrapper centers the element.** Foundry styles the element as a fill-and-grow column
   (`prose-mirror { display:flex; flex-direction:column; min-height:150px }`, `foundry2.css:472`).
   Our `.editor` wrapper uses `@include flex-row` + `@include flex-group-left`, and `flex-group-left`
   is `align-items:center` (`FlexMixins.scss:18`). The element becomes a ~150px-tall flex *item*
   centered vertically in the full-height tab → toolbar floats mid-space. Compounded by **two** nested
   `.editor` flex-row/center wrappers (the input component div + `ProseMirrorEditor`'s container div).

**Hard constraint:** the `<prose-mirror>` element is appended at runtime (`container.appendChild`), so it
never receives Svelte's scoping attribute — component-scoped `<style>` cannot target it, and `:global`
is forbidden by project rules. Its fill must come from Foundry core CSS + an **inline style set in JS**,
with the container fixed to a stretch/fill layout.

**Foundry quirk to handle:** in toggled mode, `save()` → `_refresh()` repaints the inactive view from the
element's `#enriched` field, which is captured **once** at construction. After an edit, the element would
show *stale* enriched content until it is rebuilt. We must re-enrich and rebuild the element when the
committed value changes externally.

## Affected files

- `src/helpers/svelte-components/editor/ProseMirrorEditor.svelte` (core wrapper)
- `src/document/svelte-components/input/DocumentEditorInput.svelte` (path-based, used by description/notes)
- `src/document/svelte-components/input/DocumentBoundEditorInput.svelte` (system-blob, used by description tab)

All four call sites inherit the same break: `ItemSheetDescriptionTab`, `CharacterSheetNotesTab`,
`ItemSheetTurnMessageSettings`, `ItemSheetRollMessageSettings`.

## Plan

### 1. `ProseMirrorEditor.svelte`
- Default `toggled = true`.
- Accept `enriched` and a `documentUUID` prop; pass `documentUUID` into
  `HTMLProseMirrorElement.create({ value, toggled, enriched, documentUUID })` so content links /
  relative UUIDs resolve.
- Make the container fill: replace `flex-row` + `flex-group-left` with a fill layout
  (`@include flex-column`, stretch, `width/height: 100%`, `min-height: 0`).
- Set the element to fill via **inline style** after creation: `editor.style.flex = '1'`,
  `editor.style.minHeight = '0'` (scoped CSS can't reach it).
- **Rebuild on external value change** to defeat the stale-`#enriched` quirk: when the committed
  `value` (and thus `enriched`) changes from outside an active edit, tear down and recreate the element
  (e.g. an `$effect` keyed on the enriched HTML, or a `{#key enriched}` wrapper). Guard against
  rebuilding from the editor's own in-flight edits to avoid clobbering typing / update loops.

### 2. `DocumentEditorInput.svelte` and `DocumentBoundEditorInput.svelte`
- Compute `enriched` from the current value via
  `await foundry.applications.ux.TextEditor.implementation.enrichHTML(value, {
     secrets: documentBridge.data.isOwner, relativeTo: documentBridge.doc })`
  (reactive: re-enrich when `value` changes).
- Pass `toggled={true}`, `enriched`, and `documentUUID={documentBridge.doc.uuid}` to `ProseMirrorEditor`.
- Keep `editable` gating and the existing `initialized`-guarded persist `$effect`; verify the new
  enrich/rebuild reactivity does not re-trigger the persist effect (no write-back loop).
- Remove the redundant inner `.editor` flex-row/center styling so only one fill container remains
  (or align both wrappers to the fill layout).

### 3. Verification (manual in Foundry — this is a DOM/CSS + lifecycle bug)
- Item sheet → Description tab: rendered description fills the tab; pencil button appears on hover (owner);
  click → toolbar + editable area fill top-to-bottom; edit, click away → saves and shows freshly rendered
  (not stale) content.
- Non-owner: no edit button, content still readable, links clickable.
- Notes tab and the two rules-element message settings editors render the same way.
- Build is clean (`npm run build` / lint) and no console errors on sheet open/close (mount/unmount).

### 4. Skill upkeep
- Update `titan-codebase` `references/*.md` only if a durable, verified fact changed (e.g. the editor
  wrapper now runs toggled+enriched and rebuilds on external change).

## Follow-up (post-first-fix findings)

After enabling toggled mode the edit button appeared but two issues surfaced in testing:

- **Element collapsed to 439×0.** The inline `editor.style.minHeight = '0'` overrode Foundry's
  `prose-mirror { min-height: 150px }` floor, so `flex: 1` (basis 0) collapsed to zero height (textbook
  indefinite-height-chain + no-floor). **Fixed** by removing that inline line (keep `flex: 1`).
- **Editor sits centered at 150px instead of filling from the top.** The height path
  `.tabs → Tabs .tab-content (flex: 2, definite) → .tab → ScrollingContainer → DBEI .editor →
  ProseMirrorEditor .editor → <prose-mirror>` relies on chained `height: 100%`, which collapses, so the
  editor stays at its 150px floor; then `ItemSheetDescriptionTab .tab`'s `@include flex-group-center`
  (`align-items:center; justify-content:center`) centers that block. Plus two redundant `.editor`
  wrappers (input-component div + ProseMirrorEditor container).

### Layout fix — Design A (user-confirmed): fill the tab, scroll inside, one wrapper
1. **`ItemSheetDescriptionTab.svelte`** — remove `ScrollingContainer`; render `DocumentBoundEditorInput`
   directly. `.tab` becomes a fill container: `@include flex-column`, `align-items: stretch`,
   `justify-content: flex-start`, `flex: 1`, `min-height: 0`, `width: 100%` (replace `height: 100%` and
   `flex-group-center`); keep `panel-2` + `padding-standard`.
2. **Collapse the double wrapper** — `DocumentBoundEditorInput` / `DocumentEditorInput` drop their own
   `.editor` div and pass `tooltip` + `notOwner={!isOwner}` into `ProseMirrorEditor`, which applies
   `use:tooltipAction` and the `not-owner` class on its single container div.
3. **`ProseMirrorEditor.svelte`** — container uses a robust fill: `@include flex-column`,
   `align-items: stretch`, `flex: 1 1 auto`, `min-height: 0`, `width: 100%` (no `height: 100%`); keep the
   element's inline `flex: 1` (Foundry's restored 150px `min-height` is the floor). Foundry's
   `.editor-content { overflow: hidden auto }` scrolls internally.
4. **No regression** on the other three call sites (notes tab, two rules-element message editors): verify
   they still render (fill where the parent gives flex height, content-sized ≥150px otherwise) — adjust
   only their parent containers if the wrapper consolidation broke them; do not redesign them.

## Delegation
Per project protocol, route the `.svelte` implementation to the `titan-svelte-dev` subagent with
`svelte-5`, `foundry-vtt`, and `foundry-svelte` skills loaded. Verify the subagent's findings before
accepting.
