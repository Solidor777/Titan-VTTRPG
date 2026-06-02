# Confirm-delete Dialog for Effects — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per project CLAUDE.md, route all `.js` / `.svelte` edits to the `titan-svelte-dev` subagent with the `svelte-5`, `foundry-vtt`, and `foundry-svelte` skills loaded.

**Goal:** Gate effect deletion from an actor behind a confirmation dialog governed by a new `confirmDeletingEffects` setting, mirroring the existing item-deletion path.

**Architecture:** Add a `confirmDeletingEffects` client setting, a `shouldConfirmDeletingEffects()` helper, a `ConfirmDeleteEffectDialog`, and `requestEffectDeletion`/`safeDeleteEffect` methods on `CharacterDataModel` (inherited by player + npc). Repoint the single effect-row delete button from `effect.delete()` to `requestEffectDeletion`. Each piece is a small mirror of its item-deletion counterpart.

**Tech Stack:** Svelte 5 (runes) mounted in Foundry VTT v14 ApplicationV2; Vite build to repo root; Playwright e2e; Vitest unit.

**Spec:** `docs/superpowers/specs/2026-06-01-confirm-delete-effect-dialog-design.md`

---

## File Structure

- **Create** `src/helpers/utility-functions/ShouldConfirmDeletingEffects.js` — setting-aware confirm check (modifier-key inverts).
- **Create** `src/document/types/actor/dialogs/ConfirmDeleteEffectDialog.js` — the confirmation dialog.
- **Modify** `src/system/SystemSettings.js` — register `confirmDeletingEffects`.
- **Modify** `src/document/types/actor/types/character/CharacterDataModel.js` — add `requestEffectDeletion` + `safeDeleteEffect` + two imports.
- **Modify** `src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffect.svelte` — repoint delete button + fix label.
- **Modify** `lang/en.json` — add `LOCAL.deleteEffect` / `LOCAL.confirmDeleteEffect.desc` and `SETTINGS.confirmDeletingEffects`.
- **Modify (test)** `tests/e2e/interaction-dialogs.spec.js` — seed an effect on the fixture actor; add confirm-mount + immediate-delete cases.

---

### Task 1: Failing e2e tests

**Files:**
- Test: `tests/e2e/interaction-dialogs.spec.js`

This suite already builds an `E2E Dialog Actor` (type `player`) in `beforeEach`, defaults gating settings off, and asserts dialogs mount at `.application.titan-dialog`. Extend it: seed one effect on the actor, default `confirmDeletingEffects` off, and add two tests — one proving the dialog mounts when confirm is on, one proving immediate deletion when confirm is off.

- [ ] **Step 1: Seed an effect + default the new setting off in `beforeEach`**

In the `page.evaluate` fixture builder, after the `createEmbeddedDocuments('Item', …)` block, add an effect:

```js
         // An owned effect that exists so it can be targeted by the confirm-delete-effect dialog.
         await actor.createEmbeddedDocuments('ActiveEffect', [
            {
               name: 'E2E Dialog Effect',
               type: 'effect',
               disabled: false,
            },
         ]);
```

And in the gating-settings defaults block, after the `confirmDeletingItems` line, add:

```js
         await game.settings.set('titan', 'confirmDeletingEffects', false);
```

- [ ] **Step 2: Add the two effect tests**

After the existing `confirm-delete-item dialog mounts` test, add:

```js
   // Confirm-delete-effect dialog (forced via the confirmDeletingEffects setting + requestEffectDeletion).
   test('confirm-delete-effect dialog mounts', async ({ page }) => {
      const errors = await triggerInWorld(page, `
         const actor = game.actors.getName('E2E Dialog Actor');
         const effect = actor.effects.getName('E2E Dialog Effect');
         await game.settings.set('titan', 'confirmDeletingEffects', true);
         await actor.system.requestEffectDeletion(effect.id);
      `);

      await expect(page.locator(DIALOG_SELECTOR).first()).toBeVisible();

      // The effect must still exist while the confirmation is pending.
      const stillPresent = await page.evaluate(() =>
         !!game.actors.getName('E2E Dialog Actor').effects.getName('E2E Dialog Effect'));
      expect(stillPresent, 'effect is not deleted until the dialog is confirmed').toBe(true);
      expect(errors, `uncaught errors during confirm-delete-effect dialog render:\n${errors.join('\n')}`).toEqual([]);
   });

   // Immediate effect deletion when confirmation is disabled (requestEffectDeletion -> safeDeleteEffect).
   test('requestEffectDeletion deletes immediately when confirmation is disabled', async ({ page }) => {
      const errors = await triggerInWorld(page, `
         const actor = game.actors.getName('E2E Dialog Actor');
         const effect = actor.effects.getName('E2E Dialog Effect');
         await game.settings.set('titan', 'confirmDeletingEffects', false);
         await actor.system.requestEffectDeletion(effect.id);
      `);

      // No dialog should have mounted, and the effect should be gone.
      await expect(page.locator(DIALOG_SELECTOR)).toHaveCount(0);
      const gone = await page.evaluate(() =>
         !game.actors.getName('E2E Dialog Actor').effects.getName('E2E Dialog Effect'));
      expect(gone, 'effect deleted immediately with no confirmation').toBe(true);
      expect(errors, `uncaught errors during immediate effect deletion:\n${errors.join('\n')}`).toEqual([]);
   });
```

- [ ] **Step 3: Build the current system and run the new tests — expect RED**

Run:
```bash
npm run build:e2e
npm run test:e2e -- interaction-dialogs.spec.js
```
Expected: both new tests FAIL — `actor.system.requestEffectDeletion is not a function` (the method does not exist yet). The pre-existing tests still pass. Do **not** commit yet; the red tests are committed with the fix in Task 7.

---

### Task 2: Register the `confirmDeletingEffects` setting

**Files:**
- Modify: `src/system/SystemSettings.js`
- Modify: `lang/en.json`

- [ ] **Step 1: Register the setting**

In `src/system/SystemSettings.js`, immediately after the `confirmDeletingItems` registration block (ends at the line `   });` following `type: Boolean,` near line 24), insert:

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

- [ ] **Step 2: Add the setting's lang block**

In `lang/en.json`, inside the `"SETTINGS"` object, immediately after the `"confirmDeletingItems": { … },` block (around line 627), insert:

```json
      "confirmDeletingEffects": {
         "label": "Confirm Deleting Effects from Actors",
         "hint": "If true, a confirmation dialog will be displayed when attempting to delete an Effect from an Actor. Can be suppressed by holding Shift."
      },
```

(Mirror the sibling exactly — `label`/`hint` shape — so it behaves identically to the other settings.)

---

### Task 3: Add the `shouldConfirmDeletingEffects` helper

**Files:**
- Create: `src/helpers/utility-functions/ShouldConfirmDeletingEffects.js`

- [ ] **Step 1: Create the helper (mirror of `ShouldConfirmDeletingItems.js`)**

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

---

### Task 4: Add the `ConfirmDeleteEffectDialog`

**Files:**
- Create: `src/document/types/actor/dialogs/ConfirmDeleteEffectDialog.js`

- [ ] **Step 1: Create the dialog (mirror of `ConfirmDeleteItemDialog.js`)**

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

---

### Task 5: Add `requestEffectDeletion` + `safeDeleteEffect` to `CharacterDataModel`

**Files:**
- Modify: `src/document/types/actor/types/character/CharacterDataModel.js`

- [ ] **Step 1: Add the two imports**

After the existing `import ConfirmDeleteItemDialog from '~/document/types/actor/dialogs/ConfirmDeleteItemDialog.js';` (line 9), add:

```js
import ConfirmDeleteEffectDialog from '~/document/types/actor/dialogs/ConfirmDeleteEffectDialog.js';
```

After the existing `import shouldConfirmDeletingItems from '~/helpers/utility-functions/ShouldConfirmDeletingItems.js';` (line 89), add:

```js
import shouldConfirmDeletingEffects from '~/helpers/utility-functions/ShouldConfirmDeletingEffects.js';
```

- [ ] **Step 2: Add the methods after `safeDeleteItem`**

Immediately after the `safeDeleteItem(itemId)` method (which ends near line 6201 with `   }`), insert:

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

**Note:** the structure mirrors `requestItemDeletion` exactly — there is intentionally no `return` after the `safeDeleteEffect` call. The confirm branch only runs when `shouldConfirmDeletingEffects()` is true, so the immediate-delete and confirm branches are mutually exclusive (when confirm is off, `this.parent.effects.get(effectId)` still resolves but the dialog branch is reached only if confirm is on — verify against `requestItemDeletion` lines ~6165-6186, which has the identical shape). If the sibling uses an early `return` in the no-confirm branch, match it; otherwise leave as written.

---

### Task 6: Repoint the UI button + add LOCAL lang keys

**Files:**
- Modify: `src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffect.svelte`
- Modify: `lang/en.json`

- [ ] **Step 1: Repoint the delete button**

In `CharacterSheetEffect.svelte` (the `<!--Delete Button-->` block near lines 118-126), change the `DocumentOwnerIconButton`:

FROM:
```svelte
         <DocumentOwnerIconButton
            icon={DELETE_ICON}
            label={localize('deleteItem')}
            onclick={() => effect.delete()}
            tooltip={localize('deleteItem')}
         />
```
TO:
```svelte
         <DocumentOwnerIconButton
            icon={DELETE_ICON}
            label={localize('deleteEffect')}
            onclick={() => document.data.system.requestEffectDeletion(effect.id)}
            tooltip={localize('deleteEffect')}
         />
```

- [ ] **Step 2: Add the LOCAL lang keys**

In `lang/en.json`, inside the `"LOCAL"` object, add (place near the existing `"deleteItem.text"` entry, keeping the file's alphabetical-ish ordering — `deleteEffect.text` sorts before `deleteItem.text`):

```json
      "deleteEffect.text": "Delete Effect",
      "confirmDeleteEffect.desc.text": "Are you sure you want to delete this effect from this actor?",
```

Ensure valid JSON (trailing commas only where another key follows).

---

### Task 7: Verify green, full suite, lint, commit

**Files:** none (verification + commit only)

- [ ] **Step 1: Build and confirm the new tests are GREEN**

Run:
```bash
npm run build:e2e
npm run test:e2e -- interaction-dialogs.spec.js
```
Expected: all interaction-dialog tests pass, including the two new effect tests.

- [ ] **Step 2: Full suites**

Run:
```bash
npm test
npm run test:e2e
```
Expected: unit baseline 64 passing; e2e baseline 330 + 2 new = 332 passing. No regressions (especially `reactive-effect-rows`, `effect-reactivity`, `permissions-ownership`). Re-run a single spec once if an unrelated boot-timeout flake appears.

- [ ] **Step 3: Lint**

Run:
```bash
npm run eslint
npm run stylelint
```
Expected clean (no new errors from the changed/created files).

- [ ] **Step 4: Commit**

```bash
git add src/system/SystemSettings.js \
        src/helpers/utility-functions/ShouldConfirmDeletingEffects.js \
        src/document/types/actor/dialogs/ConfirmDeleteEffectDialog.js \
        src/document/types/actor/types/character/CharacterDataModel.js \
        src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffect.svelte \
        lang/en.json \
        tests/e2e/interaction-dialogs.spec.js
git commit -m "feat(effects): confirm-delete dialog for effects (#5)"
```
Use this message body (ending with the trailer):
```
feat(effects): confirm-delete dialog for effects (#5)

Effect deletion now routes through requestEffectDeletion on CharacterDataModel
(inherited by player + npc), gated by a new client confirmDeletingEffects
setting (default true, Shift inverts) via shouldConfirmDeletingEffects, showing
ConfirmDeleteEffectDialog before deleting; safeDeleteEffect performs the
owner-gated deleteEmbeddedDocuments. The one effect-row delete button is
repointed off the raw effect.delete() and its deleteItem->deleteEffect label
fixed. Covered by two new interaction-dialogs e2e cases.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```
Stage only the seven files listed — not the leveldb pack artifacts or docs.

---

### Task 8: Close backlog + sync codebase skill

**Files:**
- Modify: `docs/TODO.md`
- Modify: `.claude/skills/titan-codebase/` (only if it documents the deletion paths)

- [ ] **Step 1: Mark backlog #5 complete**

In `docs/TODO.md` under "### 5. Confirm-delete dialog for effects", prepend a `**Status: COMPLETE.**` line summarizing the fix (new `confirmDeletingEffects` setting + `shouldConfirmDeletingEffects` + `ConfirmDeleteEffectDialog` + `requestEffectDeletion`/`safeDeleteEffect` on `CharacterDataModel`; effect-row button repointed; two e2e cases). Keep the original description for history.

- [ ] **Step 2: Sync the titan-codebase skill if it describes deletion**

Run:
```bash
grep -rn "requestItemDeletion\|safeDeleteItem\|ConfirmDeleteItemDialog\|effect.delete\|deleteEmbeddedDocuments" .claude/skills/titan-codebase/
```
If any reference enumerates the actor deletion paths or says effects delete via raw `effect.delete()`, update it to include the effect path (`requestEffectDeletion`/`safeDeleteEffect`/`ConfirmDeleteEffectDialog`/`confirmDeletingEffects`). If there are no such references, no change is needed.

- [ ] **Step 3: Commit docs**

```bash
git add docs/TODO.md .claude/skills/titan-codebase/
git commit -m "docs(effects): close backlog #5; sync codebase skill"
```

---

## Self-Review

**Spec coverage:**
- Spec §1 (setting) → Task 2. ✅
- Spec §2 (helper) → Task 3. ✅
- Spec §3 (dialog) → Task 4. ✅
- Spec §4 (`requestEffectDeletion`/`safeDeleteEffect` + imports) → Task 5. ✅
- Spec §5 (UI repoint + label fix) → Task 6 Step 1. ✅
- Spec §6 (LOCAL lang keys) → Task 6 Step 2. ✅
- Spec "Testing — e2e" (setting ON mounts dialog + effect persists; setting OFF deletes immediately) → Task 1 + Task 7 Step 1. ✅
- Project CLAUDE.md: close `TODO.md` + keep `titan-codebase` current → Task 8. ✅

**Placeholder scan:** No TBD/"handle edge cases"/"similar to". All code shown in full. The only conditional instruction (Task 5 Step 2's "match the sibling's early-return shape") is concrete — it points at exact sibling lines and the verified shape (no early return). ✅

**Type/name consistency:** `requestEffectDeletion`/`safeDeleteEffect`/`shouldConfirmDeletingEffects`/`ConfirmDeleteEffectDialog`/`confirmDeletingEffects` used identically across Tasks 2-7. Dialog stores `effect.id` and calls `this.actor.system.safeDeleteEffect(this.effectId)`; method signatures take `effectId`. Setting key `confirmDeletingEffects` matches between registration (Task 2), helper (Task 3), and tests (Task 1). Lang keys `deleteEffect`/`confirmDeleteEffect.desc` match dialog + UI usage. ✅
