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
- [x] **`$:` reactive block → `$derived.by(...)`** (also flips these two components from legacy
  mode to runes mode — they currently use neither `$props` nor `$state`):
  - `src/document/types/actor/types/character/sheet/tabs/skills/CharacterSheetSkillsList.svelte`
  - `src/document/types/item/types/spell/sheet/SpellSheetCustomAspectsTab.svelte`
- [ ] **Add `aria-label`** to the icon controls and drop the now-satisfied
  `a11y_consider_explicit_label` suppressions:
  - `src/helpers/svelte-components/tag/EditDeleteTag.svelte` — the two icon `<a>` elements.
  - `src/helpers/svelte-components/button/IconButton.svelte` — add an optional `label` prop wired to
    `aria-label`.

## Accepted debt (no action — documented decisions)

- **`EditDeleteTag.svelte` anchors-as-buttons.** The edit/delete icons are
  `<a role="button" tabindex="0">` with no `href` and no text content, so `a11y_missing_attribute`
  and `a11y_missing_content` remain suppressed even after adding `aria-label`. The clean fix is to
  convert them to `<button type="button">`, but the `tag` mixin provides no button reset, so a bare
  `<button>` would inherit browser chrome and need new reset CSS — a visual-regression risk that is
  out of scope for a mechanical cleanup. Note: those two suppression comments use the old
  hyphenated Svelte 4 names (`a11y-missing-attribute`, `a11y-missing-content`); modernize to the
  underscore Svelte 5 names if/when this component is reworked.
- **`IconButton.svelte` generic icon button.** After adding the optional `label` prop, the
  `a11y_consider_explicit_label` suppression stays as a fallback because not every call site passes
  a label. Fully retiring it requires auditing all `IconButton` consumers to pass a `label`; tracked
  as follow-up, not done here.
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
