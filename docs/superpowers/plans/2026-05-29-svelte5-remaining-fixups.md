# Svelte 5 Migration — Remaining Fixups

**Date:** 2026-05-29
**Status:** Migration functionally complete. No TyphonJS remnants in `src/`. Remaining work is
minor idiom cleanup plus accessibility debt.

This is a living tracker. Items under "Apply now" are checked off as their code fixes land; items
under "Accepted debt" are documented decisions to NOT change, with rationale.

## Apply now (low-risk)

- [x] **`on:click` → `onclick`** (Svelte 5 attribute form) in the four actor header buttons:
  - `src/document/types/actor/sheet/ActorSheetEditTokenButton.svelte`
  - `src/document/types/actor/sheet/ActorSheetImportActorButton.svelte`
  - `src/document/types/actor/sheet/ActorSheetToggleLinkedTokenButton.svelte`
  - `src/document/types/actor/sheet/ActorSheetUnlinkTokenButton.svelte`
- [x] **`$:` reactive block → `$derived` / `$derived.by(...)`** (also flips these components from
  legacy mode to runes mode — they used neither `$props` nor `$state`):
  - `src/document/types/actor/types/character/sheet/tabs/skills/CharacterSheetSkillsList.svelte`
  - `src/document/types/item/types/spell/sheet/SpellSheetCustomAspectsTab.svelte`
  - `src/document/types/actor/types/character/sheet/tabs/inventory/CharacterSheetInventoryTab.svelte`
  - `src/document/types/item/types/spell/sheet/SpellSheetSidebarCastingCheck.svelte`
- [x] **Add `aria-label`** to the icon controls and drop the now-satisfied
  `a11y_consider_explicit_label` suppressions:
  - `src/helpers/svelte-components/tag/EditDeleteTag.svelte` — the two icon `<a>` elements.
  - `src/helpers/svelte-components/button/IconButton.svelte` — add an optional `label` prop wired to
    `aria-label`.

## Resolved (2026-05-30)

- **`EditDeleteTag.svelte` anchors-as-buttons — DONE.** The edit/delete icons are now real
  `<button type="button">` with a scoped chrome reset (font-family deliberately untouched so the
  FontAwesome glyph keeps its font; the separator/layout is unchanged). All three a11y suppressions
  removed. Foundry's core `button` styles are `@layer`-ed, so the unlayered `.tag button` reset wins
  the cascade and should render identically (final in-Foundry visual sign-off pending).
- **`IconButton.svelte` generic icon button — DONE.** `label` is now a required prop and the
  `a11y_consider_explicit_label` suppression is removed. Every path that reaches `IconButton`
  (direct sites, the `MiniIconButton`/`DocumentOwnerIconButton` wrappers, and the 5 extra consumers
  surfaced by audit) supplies `label={localize('…')}`. As part of this, every `aria-label` in `src/`
  was converted to `localize()` and the needed `lang/en.json` keys were added. See
  `2026-05-30-a11y-localized-aria-labels.md`.

## Accepted debt (no action — documented decisions)

- **~21 `svelte-ignore state_referenced_locally`.** On intentional, lifetime-stable `setContext(...)`
  captures (e.g. `DocumentSheetShell.svelte`, `CheckDialogShell.svelte`, and many check-button
  components). The values never change for the component's life, so the warning is a false positive;
  suppression is the correct, documented response.
- **~7 `svelte-ignore missing-declaration`.** On the Foundry `game` global referenced in chat-message
  templates (e.g. `{#if ... && game.user.isGM}`). `game` is injected at runtime; a typed global
  declaration would remove the suppressions but is not worth the churn.

## Verification baseline

- No `@typhonjs-fvtt/runtime|standard|svelte-standard`, `#runtime/`, `#standard/`, `TJSDocument`,
  `TJSDialog`, `TJSProseMirror`, or `slideFade` imports anywhere in `src/`.
- No `export let`, `createEventDispatcher`, `<slot`, `<svelte:component`, `<svelte:fragment`,
  `beforeUpdate`/`afterUpdate`, or `svelte:options accessors` in `src/`.
