# Confirm-delete dialog for effects — design (backlog #5)

**Date:** 2026-06-01
**Status:** Approved — ready to plan
**Backlog item:** `docs/TODO.md` #5 ("Confirm-delete dialog for effects")

## Problem

Effect deletion from an actor uses native `effect.delete()` directly, with no
confirmation dialog. The existing "confirm deleting items" safeguard
(`confirmDeletingItems` setting + `ConfirmDeleteItemDialog` +
`requestItemDeletion`/`safeDeleteItem`) is **item-only**, so deleting an effect
bypasses it entirely — an accidental click is irreversible.

### Current state (verified)

- **Single entry point.** The only effect-deletion affordance in the codebase is
  the delete button in
  `src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffect.svelte`
  (`onclick={() => effect.delete()}`). There are no effect-delete buttons on item
  sheets, on the active-effect sheet header, or elsewhere. That button is also
  currently **mislabeled** — it uses `localize('deleteItem')`.
- **Shared by player + npc.** `CharacterSheetEffect` is rendered (via
  `CharacterSheetEffectList` → `CharacterSheetEffectsTab`) for the shared character
  sheet. `NPCDataModel` and `PlayerDataModel` both `extends CharacterDataModel`, so
  a method added to `CharacterDataModel` is inherited by every actor that shows the
  effects tab — exactly like `requestItemDeletion`.
- **Item path to mirror:**
  - UI → `document.data.system.requestItemDeletion(itemId)`.
  - `requestItemDeletion(itemId)`: owner-gate → `!shouldConfirmDeletingItems()` ?
    `safeDeleteItem(itemId)` : `new ConfirmDeleteItemDialog(actor, item).render(true)`.
  - `safeDeleteItem(itemId)`: owner-assert → `deleteEmbeddedDocuments('Item', [itemId])`.
  - `ConfirmDeleteItemDialog extends ConfirmationDialog`; on confirm deletes via the
    actor.
  - `shouldConfirmDeletingItems()` = `isModifierActive() ? false :
    game.settings.get('titan', 'confirmDeletingItems')` (Shift inverts).

## Decision — separate setting

Effect deletion gets its **own** `confirmDeletingEffects` setting (not a reuse of
`confirmDeletingItems`), so a user can confirm items but not effects (or vice
versa). This is the one product choice; everything else mirrors the item path.

## Components

Each unit is small and mirrors an existing item-path counterpart.

### 1. Setting — `src/system/SystemSettings.js`

Register `confirmDeletingEffects` immediately after `confirmDeletingItems`,
mirroring it exactly:

```js
// Confirm Deleting Effects.
game.settings.register('titan', 'confirmDeletingEffects', {
   config: true,
   default: true,
   hint: 'SETTINGS.confirmDeletingEffects.hint',
   name: 'SETTINGS.confirmDeletingEffects.text',
   scope: 'client',
   type: Boolean,
});
```

Lang (`lang/en.json`, `SETTINGS` block, after `confirmDeletingItems`):

```json
"confirmDeletingEffects": {
   "label": "Confirm Deleting Effects from Actors",
   "hint": "If true, a confirmation dialog will be displayed when attempting to delete an Effect from an Actor. Can be suppressed by holding Shift."
}
```

**Note (pre-existing, out of scope):** every setting registers `name` as
`SETTINGS.<key>.text` while all 56 `SETTINGS` lang entries provide `label`/`hint`
(no `.text`). The new setting mirrors the siblings exactly so it behaves
identically to the rest of the menu; the `name`-key vs lang-key inconsistency is a
pre-existing system-wide nit and is **not** addressed here.

### 2. Helper — `src/helpers/utility-functions/ShouldConfirmDeletingEffects.js`

Exact mirror of `ShouldConfirmDeletingItems.js`:

```js
import isModifierActive from '~/helpers/utility-functions/IsModifierActive.js';

/**
 * Determines whether we should confirm deleting an effect. This is normally dependent on the system setting, but is
 * inverted if the modifier key is pressed.
 * @returns {boolean} Whether we should confirm deleting an effect.
 */
export default function shouldConfirmDeletingEffects() {
   return isModifierActive() ? false : game.settings.get('titan', 'confirmDeletingEffects');
}
```

### 3. Dialog — `src/document/types/actor/dialogs/ConfirmDeleteEffectDialog.js`

Mirror of `ConfirmDeleteItemDialog.js`:

```js
import localize from '~/helpers/utility-functions/Localize.js';
import ConfirmationDialog from '~/helpers/dialogs/ConfirmationDialog.js';

/**
 * A confirmation dialog for deleting an Active Effect from the Actor.
 * @extends {ConfirmationDialog}
 */
export default class ConfirmDeleteEffectDialog extends ConfirmationDialog {

   /**
    * Configures the confirmation prompt and registers the callback that deletes the Effect from the Actor on confirm.
    * @param {TitanActor} actor - The Actor to delete the Effect from.
    * @param {TitanActiveEffect} effect - The Effect to delete from the Actor.
    */
   constructor(actor, effect) {
      super(
         localize('deleteEffect'),
         [
            actor.name,
            effect.name,
         ],
         localize('confirmDeleteEffect.desc'),
         localize('deleteEffect'),
         () => {
            if (this.actor) {
               this.actor.system.safeDeleteEffect(this.effectId);
            }
         },
      );

      this.actor = actor;
      this.effectId = effect.id;
   }
}
```

(The item dialog calls `actor.deleteItem`; the effect dialog funnels through the
data-model method `safeDeleteEffect` so all effect-deletion goes through one
owner-gated path.)

### 4. `CharacterDataModel` methods

Add beside `requestItemDeletion` / `safeDeleteItem`, importing
`ConfirmDeleteEffectDialog` and `shouldConfirmDeletingEffects`:

```js
/**
 * Requests deletion of an Active Effect from this Character, prompting for confirmation per the
 * confirmDeletingEffects setting (suppressed by holding the modifier key).
 * @param {string} effectId - The ID of the Effect to delete.
 * @returns {Promise<void>}
 */
async requestEffectDeletion(effectId) {
   if (assert(
      this.parent.isOwner,
      'Cannot modify document %s if not owner.',
      this.parent.name,
   )) {

      // If the deletion does not need to be confirmed, then delete the effect.
      if (!shouldConfirmDeletingEffects()) {
         await this.safeDeleteEffect(effectId);
      }

      // Otherwise, confirm deleting the effect.
      const effect = this.parent.effects.get(effectId);
      if (effect) {
         new ConfirmDeleteEffectDialog(
            this.parent,
            effect,
         ).render(true);
      }
   }
}

/**
 * Deletes an Active Effect from this Character without a confirmation dialog.
 * @param {string} effectId - The ID of the Effect to be deleted.
 * @returns {Promise<void>}
 */
async safeDeleteEffect(effectId) {
   if (assert(
      this.parent.isOwner,
      'Cannot modify document %s if not owner.',
      this.parent.name,
   )) {
      await this.parent.deleteEmbeddedDocuments('ActiveEffect', [effectId]);
   }
}
```

Structure matches `requestItemDeletion`/`safeDeleteItem` exactly (same owner-gate,
same early-return-on-no-confirm shape). Note the non-confirm branch does not
`return` after `safeDeleteEffect` — but because the confirm branch only runs when
`shouldConfirmDeletingEffects()` is true, the two are mutually exclusive; this
mirrors `requestItemDeletion` verbatim (which also relies on the guard, not an
early `return`).

### 5. UI — `CharacterSheetEffect.svelte`

Change the delete `DocumentOwnerIconButton`:

```svelte
<DocumentOwnerIconButton
   icon={DELETE_ICON}
   label={localize('deleteEffect')}
   onclick={() => document.data.system.requestEffectDeletion(effect.id)}
   tooltip={localize('deleteEffect')}
/>
```

(`label`/`tooltip` change from `deleteItem` to `deleteEffect`; `onclick` repointed
from `effect.delete()` to `requestEffectDeletion`.)

### 6. Lang (LOCAL) — `lang/en.json`

Add under the `LOCAL` block (alongside `deleteItem.text` /
`confirmDeleteItem.desc.text`):

```json
"deleteEffect.text": "Delete Effect",
"confirmDeleteEffect.desc.text": "Are you sure you want to delete this effect from this actor?"
```

## Testing — e2e

Add cases mirroring `tests/e2e/interaction-dialogs.spec.js` (confirm-delete-item)
and `tests/e2e/reactive-effect-rows.spec.js` (effect row harness). Use an actor
with one effect:

1. **Setting ON** (`game.settings.set('titan','confirmDeletingEffects', true)`):
   invoke `actor.system.requestEffectDeletion(effectId)` →
   `ConfirmDeleteEffectDialog` mounts (assert the dialog window is present) and the
   effect still exists on the actor; then click the dialog's confirm button and
   assert the effect is removed.
2. **Setting OFF** (`false`): invoke `requestEffectDeletion(effectId)` → the effect
   is deleted immediately with no dialog.

The dialog-mount assertion follows the `interaction-dialogs` pattern (dialog root
`.application.titan-dialog`). The deletion/persistence assertion reads
`actor.effects.get(effectId)` / `actor.effects.size`.

## Risk / blast radius

- **Low, additive.** New setting + helper + dialog + two `CharacterDataModel`
  methods; one UI line repointed and one label corrected. No data migration. No
  engine/computation changes.
- Owner-gating preserved end-to-end: `DocumentOwnerIconButton` (UI),
  `requestEffectDeletion`/`safeDeleteEffect` asserts (data model), and Foundry's
  own embedded-document permission check.
- The new setting defaults to `true` (confirm), matching `confirmDeletingItems` —
  no behavior surprise for existing users (deletion gains a confirm step by
  default, which is the safer default and the point of the feature).

## Out of scope

- Reusing/merging with `confirmDeletingItems` (explicitly a separate setting).
- Effect deletion from any non-character context (no such UI exists).
- The pre-existing `SETTINGS.<key>.text` vs lang-`.label` convention mismatch.
- Generalizing `ConfirmDeleteItemDialog` + `ConfirmDeleteEffectDialog` into one
  shared dialog (kept as parallel mirrors for clarity; YAGNI).
