# Roll Checks From Item Sheets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. NOTE: implementation subagents in this repo run **serially** (shared working tree, `dist/`, and Foundry world) — never dispatch item-sheet tasks in parallel.

**Goal:** Let a user roll an item's checks directly from the item sheet (sidebar + editing settings panels) whenever the item is embedded on an actor they own or GM, reusing the existing condensed check button and actor roll path.

**Architecture:** A pure helper `resolveRollActor` resolves the rolling actor for any sheet and is published once as a `rollActor` Svelte context by the shared `DocumentSheetShell`. The three character-sheet condensed buttons move to a shared location, become index-aware, and read the roller from `rollActor` instead of `sheetDocument`. Item-sheet sidebar surfaces swap their static info line for the matching button (gated on `rollActor`), and the three settings panels gain a top roll-preview row.

**Tech Stack:** Foundry VTT v14 (ApplicationV2), pure Svelte 5 (runes) mounted via `mount()`, Vitest (unit), Playwright (e2e). Source under `src/`; build output to repo root via `vite build`.

**Reference spec:** `docs/superpowers/specs/2026-06-11-roll-checks-from-item-sheets-design.md`

---

## File Structure

New:
- `src/document/reactive/ResolveRollActor.js` — pure roller-resolution helper.
- `src/document/svelte-components/check/CondensedItemCheckButton.svelte` — moved + generalized.
- `src/document/svelte-components/check/CondensedAttackCheckButton.svelte` — moved + generalized.
- `src/document/svelte-components/check/CondensedCastingCheckButton.svelte` — moved + generalized.
- `tests/unit/ResolveRollActor.test.js` — unit tests for the helper.
- `tests/e2e/item-sheet-roll.spec.js` — GM positive: button renders + rolls on all three sheets/surfaces.
- `tests/e2e/item-sheet-roll-gating.spec.js` — Player login: present when owned, absent (info line) when only observed.

Removed (after the move):
- `src/document/types/actor/types/character/sheet/items/CharacterSheetCondensedItemCheckButton.svelte`
- `src/document/types/actor/types/character/sheet/items/CharacterSheetCondensedAttackCheckButton.svelte`
- `src/document/types/actor/types/character/sheet/items/spell/CharacterSheetCondensedCastingCheckButton.svelte`

Modified:
- `src/document/sheet/DocumentSheetShell.svelte` — resolve + provide `rollActor`.
- `src/document/svelte-components/check/SidebarCheck.svelte` — optional `rollButton` snippet replaces the info line.
- `src/document/types/item/sheet/check/ItemSheetSidebarCheck.svelte` — pass the item-check button snippet.
- `src/document/types/item/types/weapon/sheet/WeaponSheetSidebarAttacks.svelte` — pass the attack button snippet per row.
- `src/document/types/item/types/spell/sheet/SpellSheetSidebarCastingCheck.svelte` — pass the casting button snippet.
- `src/document/types/item/sheet/check/ItemSheetCheckSettings.svelte` — top roll row.
- `src/document/types/item/types/weapon/sheet/WeaponSheetAttackSettings.svelte` — top roll row.
- `src/document/types/item/types/spell/sheet/SpellSheetCastingCheckTab.svelte` — top roll row.
- Six character-sheet importers (new button paths): `CharacterSheetAbility`, `CharacterSheetArmor`, `CharacterSheetEquipment`, `CharacterSheetShield`, `CharacterSheetSpell`, `CharacterSheetWeapon`.
- `tests/e2e/embedded-context-check-parity.spec.js` — the GM sees the roll button, not the `.info` line.

---

### Task 1: `resolveRollActor` helper (TDD)

**Files:**
- Create: `src/document/reactive/ResolveRollActor.js`
- Test: `tests/unit/ResolveRollActor.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/ResolveRollActor.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import resolveRollActor from '~/document/reactive/ResolveRollActor.js';

/**
 * Builds a fake character actor document whose system exposes the check-roll methods.
 * @param {object} [overrides] - Extra fields merged onto the actor doc.
 * @returns {object} A fake Actor document.
 */
function makeCharacterActor(overrides = {}) {
   return {
      documentName: 'Actor',
      system: {
         requestItemCheck() {},
      },
      ...overrides,
   };
}

/**
 * Wraps a fake doc in a minimal bridge shape ({ doc }) matching ReactiveDocument's accessor surface.
 * @param {object} doc - The fake document to wrap.
 * @returns {object} A stub bridge.
 */
function makeBridge(doc) {
   return { doc };
}

describe('resolveRollActor', () => {
   it('returns the same bridge for a character actor sheet', () => {
      const bridge = makeBridge(makeCharacterActor());
      expect(resolveRollActor(bridge)).toBe(bridge);
   });

   it('returns a parent-actor bridge for an owned item whose parent is a character', () => {
      const parent = makeCharacterActor();
      const bridge = makeBridge({
         documentName: 'Item',
         isEmbedded: true,
         isOwner: true,
         parent,
      });
      const result = resolveRollActor(bridge);
      expect(result).toBeDefined();
      expect(result.doc).toBe(parent);
   });

   it('returns undefined for an owned item when the user is not its owner', () => {
      const bridge = makeBridge({
         documentName: 'Item',
         isEmbedded: true,
         isOwner: false,
         parent: makeCharacterActor(),
      });
      expect(resolveRollActor(bridge)).toBeUndefined();
   });

   it('returns undefined for a world item (not embedded)', () => {
      const bridge = makeBridge({
         documentName: 'Item',
         isEmbedded: false,
         isOwner: true,
         parent: null,
      });
      expect(resolveRollActor(bridge)).toBeUndefined();
   });

   it('returns undefined for an owned item whose parent cannot roll checks', () => {
      const bridge = makeBridge({
         documentName: 'Item',
         isEmbedded: true,
         isOwner: true,
         parent: { documentName: 'Actor', system: {} },
      });
      expect(resolveRollActor(bridge)).toBeUndefined();
   });

   it('returns undefined for a non-character actor sheet', () => {
      const bridge = makeBridge({ documentName: 'Actor', system: {} });
      expect(resolveRollActor(bridge)).toBeUndefined();
   });

   it('returns undefined when given nothing', () => {
      expect(resolveRollActor(undefined)).toBeUndefined();
   });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/ResolveRollActor.test.js`
Expected: FAIL — cannot resolve `~/document/reactive/ResolveRollActor.js` (module does not exist).

- [ ] **Step 3: Write the implementation**

Create `src/document/reactive/ResolveRollActor.js`:

```javascript
import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';

/**
 * Determines whether a document is a character actor whose data model can roll checks.
 * @param {foundry.abstract.Document} doc - The document to inspect.
 * @returns {boolean} True when the document is an Actor exposing the check-roll methods.
 */
function isRollCapableActor(doc) {
   return doc?.documentName === 'Actor' && typeof doc.system?.requestItemCheck === 'function';
}

/**
 * Resolves the actor that should perform checks for a sheet, bridged for Svelte reactivity.
 *
 * On an actor sheet the actor rolls for itself (ownership is enforced at the button, preserving the
 * character sheet's render-but-disable behavior). On an owned item sheet the item's parent character
 * actor rolls, but only when the current user owns it — `isOwner` already encodes "owns the actor or
 * is a GM" for an embedded item. World/compendium items, non-owners, and non-character documents
 * resolve to undefined, so callers keep their static display with no roll button.
 * @param {import('~/document/reactive/ReactiveDocument.svelte.js').default} document - The sheet's
 * top-level reactive Document bridge.
 * @returns {import('~/document/reactive/ReactiveDocument.svelte.js').default|undefined} The rolling
 * actor's bridge, or undefined when the sheet is not roll-capable for the current user.
 */
export default function resolveRollActor(document) {
   const doc = document?.doc;

   // An actor sheet: the actor rolls for itself.
   if (isRollCapableActor(doc)) {
      return document;
   }

   // An owned item sheet: the parent character actor rolls, gated on the current user owning it.
   if (doc?.documentName === 'Item' && doc.isEmbedded && doc.isOwner && isRollCapableActor(doc.parent)) {
      return new ReactiveDocument(doc.parent);
   }

   return undefined;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/ResolveRollActor.test.js`
Expected: PASS (7 passing).

- [ ] **Step 5: Commit**

```bash
git add src/document/reactive/ResolveRollActor.js tests/unit/ResolveRollActor.test.js
git commit -m "feat: resolveRollActor helper for item-sheet check rolling"
```

---

### Task 2: Publish the `rollActor` context from the shared shell

**Files:**
- Modify: `src/document/sheet/DocumentSheetShell.svelte`

- [ ] **Step 1: Add the import**

In the `<script>` block, after `import { setContext } from 'svelte';`, add:

```javascript
   import resolveRollActor from '~/document/reactive/ResolveRollActor.js';
```

- [ ] **Step 2: Resolve and provide `rollActor`**

After the existing `setContext('sheetDocument', document);` line, add:

```javascript
   // The actor that rolls checks for this sheet, or undefined when the sheet is not roll-capable for
   // the current user (world/compendium item, non-owner, or a document type that does not roll
   // checks). Resolved once at mount: an item's parent and ownership are stable while its sheet is open.
   // svelte-ignore state_referenced_locally
   const rollActor = resolveRollActor(document);
   // svelte-ignore state_referenced_locally
   setContext('rollActor', rollActor);
```

- [ ] **Step 3: Build to verify the shell compiles**

Run: `npm run build`
Expected: build succeeds with no Svelte compile errors. (Do not run while an e2e suite is running.)

- [ ] **Step 4: Commit**

```bash
git add src/document/sheet/DocumentSheetShell.svelte
git commit -m "feat: publish rollActor context from the shared sheet shell"
```

---

### Task 3: Relocate and generalize the three condensed buttons

This task moves the buttons, makes them read `rollActor` and accept an optional `idx`, repoints the six character-sheet importers, and deletes the originals. After it, the character sheet rolls through `rollActor` (which resolves to the actor itself), so behavior there is unchanged.

**Files:**
- Create: `src/document/svelte-components/check/CondensedItemCheckButton.svelte`
- Create: `src/document/svelte-components/check/CondensedAttackCheckButton.svelte`
- Create: `src/document/svelte-components/check/CondensedCastingCheckButton.svelte`
- Modify: `src/document/types/actor/types/character/sheet/items/ability/CharacterSheetAbility.svelte`
- Modify: `src/document/types/actor/types/character/sheet/items/armor/CharacterSheetArmor.svelte`
- Modify: `src/document/types/actor/types/character/sheet/items/equipment/CharacterSheetEquipment.svelte`
- Modify: `src/document/types/actor/types/character/sheet/items/shield/CharacterSheetShield.svelte`
- Modify: `src/document/types/actor/types/character/sheet/items/spell/CharacterSheetSpell.svelte`
- Modify: `src/document/types/actor/types/character/sheet/items/weapon/CharacterSheetWeapon.svelte`
- Delete: the three `CharacterSheetCondensed*CheckButton.svelte` files.

- [ ] **Step 1: Create `CondensedItemCheckButton.svelte`**

```svelte
<script>
   import CondensedCheckButton from '~/helpers/svelte-components/button/CondensedCheckButton.svelte';
   import { getContext } from 'svelte';
   import getItemCheckParametersTooltip from '~/helpers/utility-functions/GetItemCheckParametersTooltip.js';

   /**
    * @typedef {object} CondensedItemCheckButtonProps
    * @property {number} [idx] - Index of the item check this button rolls.
    */

   /** @type {CondensedItemCheckButtonProps} */
   const { idx = 0 } = $props();

   /** @type {object} The item bridge: the embedded item on the actor sheet, the sheet's item on the item sheet. */
   const document = getContext('document');

   /** @type {object|undefined} The actor that rolls this check (actor sheet's actor, or the item's parent actor). */
   const rollActor = getContext('rollActor');

   // The item id is fixed for this component's lifetime; capturing it once in checkOptions is intentional.
   /** @type {ItemCheckOptions} Base options for the Item Check, targeting this row's check index. */
   const checkOptions = {
      itemId: document.doc._id,
      checkIdx: idx,
   };

   /** @type {ItemCheckParameters|undefined} Resolved dice and modifiers for the item check this button rolls. */
   let checkParameters = $derived.by(() => {
      if (rollActor && document.data?.system.check.length > 0) {
         return rollActor.data.system.getItemCheckParameters(
            rollActor.data.system.initializeItemCheckOptions(checkOptions),
         );
      }
      return undefined;
   });

   /** @type {string|undefined} Calculated tooltip. */
   let tooltip = $derived(
      checkParameters ? getItemCheckParametersTooltip(checkParameters) : undefined,
   );
</script>

{#if checkParameters}
   <CondensedCheckButton
      attribute={checkParameters.attribute}
      complexity={checkParameters.complexity}
      difficulty={checkParameters.difficulty}
      onclick={() => rollActor.data.system.requestItemCheck(checkOptions)}
      resolveCost={checkParameters.resolveCost}
      tooltip={{ text: tooltip, localize: false }}
      totalDice={checkParameters.totalDice}
      totalExpertise={checkParameters.totalExpertise}
   />
{/if}
```

- [ ] **Step 2: Create `CondensedAttackCheckButton.svelte`**

```svelte
<script>
   import { getContext } from 'svelte';
   import { ACCURACY_ICON, MELEE_ICON } from '~/system/Icons.js';
   import CondensedCheckButton from '~/helpers/svelte-components/button/CondensedCheckButton.svelte';
   import getAttributeCheckParametersTooltip from '~/helpers/utility-functions/GetAttributeCheckParametersTooltip.js';

   /**
    * @typedef {object} CondensedAttackCheckButtonProps
    * @property {number} [idx] - Index of the attack this button rolls.
    */

   /** @type {CondensedAttackCheckButtonProps} */
   const { idx = 0 } = $props();

   /** @type {object} The item bridge: the embedded weapon on the actor sheet, the sheet's weapon on the item sheet. */
   const document = getContext('document');

   /** @type {object|undefined} The actor that rolls this attack. */
   const rollActor = getContext('rollActor');

   // The item id is fixed for this component's lifetime; capturing it once in checkOptions is intentional.
   /** @type {AttackCheckOptions} Base options for the Attack Check, targeting this row's attack index. */
   const checkOptions = {
      itemId: document.doc._id,
      attackIdx: idx,
   };

   /** @type {AttackCheckParameters|undefined} Resolved dice and modifiers for the attack check this button rolls. */
   let checkParameters = $derived.by(() => {
      if (rollActor && document.data?.system.attack.length > 0) {
         return rollActor.data.system.getAttackCheckParameters(
            rollActor.data.system.initializeAttackCheckOptions(checkOptions),
         );
      }
      return undefined;
   });

   /** @type {string} Calculated check icon. */
   let icon = $derived(
      checkParameters?.type === 'melee' ? MELEE_ICON : ACCURACY_ICON,
   );

   /** @type {string|undefined} Calculated tooltip. */
   let tooltip = $derived(
      checkParameters ? getAttributeCheckParametersTooltip(checkParameters) : undefined,
   );
</script>

{#if checkParameters}
   <CondensedCheckButton
      attribute={checkParameters.attribute}
      checkIcon={icon}
      onclick={() => rollActor.data.system.requestAttackCheck(checkOptions)}
      tooltip={{ text: tooltip, localize: false }}
      totalDice={checkParameters.totalDice}
      totalExpertise={checkParameters.totalExpertise}
   />
{/if}
```

- [ ] **Step 3: Create `CondensedCastingCheckButton.svelte`**

```svelte
<script>
   import { getContext } from 'svelte';
   import getAttributeCheckParametersTooltip from '~/helpers/utility-functions/GetAttributeCheckParametersTooltip.js';
   import CondensedCheckButton from '~/helpers/svelte-components/button/CondensedCheckButton.svelte';

   /** @type {object} The item bridge: the embedded spell on the actor sheet, the sheet's spell on the item sheet. */
   const document = getContext('document');

   /** @type {object|undefined} The actor that rolls this casting check. */
   const rollActor = getContext('rollActor');

   // The item id is fixed for this component's lifetime; capturing it once in checkOptions is intentional.
   /** @type {CastingCheckOptions} Base options for the Casting Check. */
   const checkOptions = {
      itemId: document.doc._id,
   };

   /** @type {CastingCheckParameters|undefined} Resolved dice and modifiers for the casting check this button rolls. */
   let checkParameters = $derived.by(() => {
      if (rollActor && document.data) {
         return rollActor.data.system.getCastingCheckParameters(
            rollActor.data.system.initializeCastingCheckOptions(checkOptions),
         );
      }
      return undefined;
   });

   /** @type {string|undefined} Calculated tooltip. */
   let tooltip = $derived(
      checkParameters ? getAttributeCheckParametersTooltip(checkParameters) : undefined,
   );
</script>

{#if checkParameters}
   <CondensedCheckButton
      attribute={checkParameters.attribute}
      complexity={checkParameters.complexity}
      difficulty={checkParameters.difficulty}
      onclick={() => rollActor.data.system.requestCastingCheck(checkOptions)}
      tooltip={{ text: tooltip, localize: false }}
      totalDice={checkParameters.totalDice}
      totalExpertise={checkParameters.totalExpertise}
   />
{/if}
```

- [ ] **Step 4: Repoint the four item-check importers**

In each of `…/items/ability/CharacterSheetAbility.svelte`, `…/items/armor/CharacterSheetArmor.svelte`, `…/items/equipment/CharacterSheetEquipment.svelte`, `…/items/shield/CharacterSheetShield.svelte`:

Replace the two-line import:

```svelte
   import CharacterSheetCondensedItemCheckButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetCondensedItemCheckButton.svelte';
```

with:

```svelte
   import CondensedItemCheckButton from '~/document/svelte-components/check/CondensedItemCheckButton.svelte';
```

and replace the usage `<CharacterSheetCondensedItemCheckButton/>` with `<CondensedItemCheckButton/>`.

- [ ] **Step 5: Repoint the spell importer**

In `…/items/spell/CharacterSheetSpell.svelte`, replace:

```svelte
   import CharacterSheetCondensedCastingCheckButton
      from '~/document/types/actor/types/character/sheet/items/spell/CharacterSheetCondensedCastingCheckButton.svelte';
```

with:

```svelte
   import CondensedCastingCheckButton from '~/document/svelte-components/check/CondensedCastingCheckButton.svelte';
```

and replace the usage `<CharacterSheetCondensedCastingCheckButton/>` with `<CondensedCastingCheckButton/>`.

- [ ] **Step 6: Repoint the weapon importer**

In `…/items/weapon/CharacterSheetWeapon.svelte`, replace:

```svelte
   import CharacterSheetCondensedAttackCheckButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetCondensedAttackCheckButton.svelte';
```

with:

```svelte
   import CondensedAttackCheckButton from '~/document/svelte-components/check/CondensedAttackCheckButton.svelte';
```

and replace the usage `<CharacterSheetCondensedAttackCheckButton/>` with `<CondensedAttackCheckButton/>`.

- [ ] **Step 7: Delete the three original files**

```bash
git rm src/document/types/actor/types/character/sheet/items/CharacterSheetCondensedItemCheckButton.svelte src/document/types/actor/types/character/sheet/items/CharacterSheetCondensedAttackCheckButton.svelte src/document/types/actor/types/character/sheet/items/spell/CharacterSheetCondensedCastingCheckButton.svelte
```

- [ ] **Step 8: Confirm no stale references remain**

Run: `git grep -n "CharacterSheetCondensed.*CheckButton" -- "src/**"`
Expected: no output.

- [ ] **Step 9: Build to verify everything compiles**

Run: `npm run build`
Expected: build succeeds. The character sheet now rolls through `rollActor` (its own actor) with no behavior change.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor: share condensed check buttons via rollActor context"
```

---

### Task 4: `SidebarCheck` — optional `rollButton` snippet replaces the info line

**Files:**
- Modify: `src/document/svelte-components/check/SidebarCheck.svelte`

- [ ] **Step 1: Add the prop to the typedef and destructure**

In the `SidebarCheckProps` typedef, after the `expanded` line, add:

```svelte
    * @property {import('svelte').Snippet} [rollButton] - Optional roll button rendered in place of the info line.
```

In the destructure, add `rollButton` (before `children`):

```svelte
      expanded = $bindable(true),
      rollButton = undefined,
      children,
```

- [ ] **Step 2: Swap the info line for the snippet when provided**

Replace the existing `.info` block:

```svelte
      <!--Attribute, Skill, and DC row-->
      <div class="info">
         {localize(attribute)}{skill && skill !== 'none' ? ` (${localize(skill)})` : ''}
         {#if difficulty !== undefined}
            &nbsp;•&nbsp;{localize('dc')} {difficulty}:{complexity}
         {/if}
      </div>
```

with:

```svelte
      {#if rollButton}
         <!--Roll button replaces the static info line for a user who can roll this check.-->
         <div class="roll">
            {@render rollButton()}
         </div>
      {:else}
         <!--Attribute, Skill, and DC row-->
         <div class="info">
            {localize(attribute)}{skill && skill !== 'none' ? ` (${localize(skill)})` : ''}
            {#if difficulty !== undefined}
               &nbsp;•&nbsp;{localize('dc')} {difficulty}:{complexity}
            {/if}
         </div>
      {/if}
```

- [ ] **Step 3: Add the `.roll` style**

Inside the `.header` SCSS block (alongside `.name` and `.info`), add:

```scss
         .roll {
            @include flex-row;
            @include flex-group-center;

            width: 100%;
         }
```

- [ ] **Step 4: Build to verify it compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/document/svelte-components/check/SidebarCheck.svelte
git commit -m "feat: SidebarCheck optional rollButton snippet replaces the info line"
```

---

### Task 5: Wire the roll button into the three sidebar surfaces

Each surface reads `rollActor` and passes a `rollButton` snippet only when it is present; otherwise `SidebarCheck` renders the static info line as today.

**Files:**
- Modify: `src/document/types/item/sheet/check/ItemSheetSidebarCheck.svelte`
- Modify: `src/document/types/item/types/weapon/sheet/WeaponSheetSidebarAttacks.svelte`
- Modify: `src/document/types/item/types/spell/sheet/SpellSheetSidebarCastingCheck.svelte`

- [ ] **Step 1: Item-check sidebar — `ItemSheetSidebarCheck.svelte`**

Add the import (with the other imports):

```svelte
   import CondensedItemCheckButton from '~/document/svelte-components/check/CondensedItemCheckButton.svelte';
```

Add the context read (after the `appState` line):

```svelte
   /** @type {object|undefined} The actor that can roll this item's checks, or undefined when the current user cannot. */
   const rollActor = getContext('rollActor');
```

Replace the `{#if check} … {/if}` block with:

```svelte
{#if check}
   {#snippet rollButtonSnippet()}
      <CondensedItemCheckButton {idx}/>
   {/snippet}

   <SidebarCheck
      attribute={check.attribute}
      complexity={check.complexity}
      difficulty={check.difficulty}
      icon={DICE_ICON}
      label={check.label}
      skill={check.skill}
      rollButton={rollActor ? rollButtonSnippet : undefined}
      {hasDetails}
      bind:expanded={
         () => $appState.sidebar.checks.isExpanded[idx] ?? true,
         (value) => $appState.sidebar.checks.isExpanded[idx] = value
      }
   >
      <!--Check details beyond the header basics-->
      <CheckTags
         {idx}
         hideBasics={true}
      />
   </SidebarCheck>
{/if}
```

- [ ] **Step 2: Attack sidebar — `WeaponSheetSidebarAttacks.svelte`**

Add the import:

```svelte
   import CondensedAttackCheckButton from '~/document/svelte-components/check/CondensedAttackCheckButton.svelte';
```

Add the context read (after the `appState` line):

```svelte
   /** @type {object|undefined} The actor that can roll this weapon's attacks, or undefined when the current user cannot. */
   const rollActor = getContext('rollActor');
```

Replace the `{#each …}` body so each row defines its own snippet and passes it gated:

```svelte
   {#each document.data.system.attack as attack, idx (attack.uuid)}
      <li transition:slide|local>
         {#snippet rollButtonSnippet()}
            <CondensedAttackCheckButton {idx}/>
         {/snippet}

         <!--Attacks have no fixed DC (the target's defense sets it), so the header omits one. The
         function binding falls back to the seeded expanded default for freshly added attacks.-->
         <SidebarCheck
            attribute={attack.attribute}
            hasDetails={true}
            icon={attack.type === 'melee' ? MELEE_ICON : ACCURACY_ICON}
            label={attack.label}
            skill={attack.skill}
            rollButton={rollActor ? rollButtonSnippet : undefined}
            bind:expanded={
               () => $appState.sidebar.attacks.isExpanded[idx] ?? true,
               (value) => $appState.sidebar.attacks.isExpanded[idx] = value
            }
         >
            <!--Attack details beyond the header basics-->
            <AttackTags
               {idx}
               hideBasics={true}
            />
         </SidebarCheck>
      </li>
   {/each}
```

- [ ] **Step 3: Casting sidebar — `SpellSheetSidebarCastingCheck.svelte`**

Add the import:

```svelte
   import CondensedCastingCheckButton from '~/document/svelte-components/check/CondensedCastingCheckButton.svelte';
```

Add the context read (after the existing `document` read):

```svelte
   /** @type {object|undefined} The actor that can roll this spell's casting check, or undefined when the current user cannot. */
   const rollActor = getContext('rollActor');
```

Replace the `<SidebarCheck … >` element (keeping `<SpellSheetSidebarAspects/>` as its child) with:

```svelte
{#snippet rollButtonSnippet()}
   <CondensedCastingCheckButton/>
{/snippet}

<!--Casting Check-->
<SidebarCheck
   attribute={castingCheck.attribute}
   complexity={castingCheck.complexity}
   difficulty={castingCheck.difficulty}
   hasDetails={aspectsEnabled}
   icon={CASTING_ICON}
   label={localize('castingCheck')}
   rollButton={rollActor ? rollButtonSnippet : undefined}
   skill={castingCheck.skill}
   bind:expanded={$appState.sidebar.castingCheck.isExpanded}
>
   <!--Aspects-->
   <SpellSheetSidebarAspects/>
</SidebarCheck>
```

- [ ] **Step 4: Build to verify all three compile**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/document/types/item/sheet/check/ItemSheetSidebarCheck.svelte src/document/types/item/types/weapon/sheet/WeaponSheetSidebarAttacks.svelte src/document/types/item/types/spell/sheet/SpellSheetSidebarCastingCheck.svelte
git commit -m "feat: roll button replaces the info line on item-sheet sidebars"
```

---

### Task 6: Add the top roll-preview row to the three settings panels

Each panel renders the matching button as the first row of its settings, gated on `rollActor`.

**Files:**
- Modify: `src/document/types/item/sheet/check/ItemSheetCheckSettings.svelte`
- Modify: `src/document/types/item/types/weapon/sheet/WeaponSheetAttackSettings.svelte`
- Modify: `src/document/types/item/types/spell/sheet/SpellSheetCastingCheckTab.svelte`

- [ ] **Step 1: Item check settings — `ItemSheetCheckSettings.svelte`**

Add the import:

```svelte
   import CondensedItemCheckButton from '~/document/svelte-components/check/CondensedItemCheckButton.svelte';
```

Add the context read (after the `appState` line):

```svelte
   /** @type {object|undefined} The actor that can roll this check, or undefined when the current user cannot. */
   const rollActor = getContext('rollActor');
```

Inside `<div class="expandable-content" transition:slide|local>`, as its FIRST child (immediately before the existing first `<div class="row">`), add:

```svelte
            {#if rollActor}
               <!--Live roll preview for the configured check.-->
               <div class="row">
                  <CondensedItemCheckButton {idx}/>
               </div>
            {/if}
```

- [ ] **Step 2: Weapon attack settings — `WeaponSheetAttackSettings.svelte`**

Add the import:

```svelte
   import CondensedAttackCheckButton from '~/document/svelte-components/check/CondensedAttackCheckButton.svelte';
```

Add the context read (after the `appState` line):

```svelte
   /** @type {object|undefined} The actor that can roll this attack, or undefined when the current user cannot. */
   const rollActor = getContext('rollActor');
```

Inside `<div class="expandable-content" transition:slide|local>`, as its FIRST child (immediately before the existing first `<div class="row">`), add:

```svelte
            {#if rollActor}
               <!--Live roll preview for the configured attack.-->
               <div class="row">
                  <CondensedAttackCheckButton {idx}/>
               </div>
            {/if}
```

- [ ] **Step 3: Spell casting settings — `SpellSheetCastingCheckTab.svelte`**

Add the import:

```svelte
   import CondensedCastingCheckButton from '~/document/svelte-components/check/CondensedCastingCheckButton.svelte';
```

Add the context read (after the `appState` line):

```svelte
   /** @type {object|undefined} The actor that can roll this casting check, or undefined when the current user cannot. */
   const rollActor = getContext('rollActor');
```

Inside `<div class="casting-check-settings">`, as its FIRST child (immediately before the first `<div class="row">` holding the attribute/skill), add:

```svelte
      {#if rollActor}
         <!--Live roll preview for the casting check.-->
         <div class="row">
            <CondensedCastingCheckButton/>
         </div>
      {/if}
```

- [ ] **Step 4: Build to verify all three compile**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/document/types/item/sheet/check/ItemSheetCheckSettings.svelte src/document/types/item/types/weapon/sheet/WeaponSheetAttackSettings.svelte src/document/types/item/types/spell/sheet/SpellSheetCastingCheckTab.svelte
git commit -m "feat: roll-preview row atop the item-sheet check settings panels"
```

---

### Task 7: Update the existing parity spec for the info→button swap

`embedded-context-check-parity.spec.js` opens the equipment item sheet as the GM login. A GM owns every item, so `rollActor` is now present and the sidebar header renders the roll button instead of the `.info` line. The CheckTags details (the four `check-tags-*` values it compares) are unaffected — only the header info assertion must change.

**Files:**
- Modify: `tests/e2e/embedded-context-check-parity.spec.js`

- [ ] **Step 1: Replace the header info assertion**

In the test `'equipment check tags render identical values on the item sheet and the character sheet'`, replace:

```javascript
      // The sidebar header must render the basics the hidden tag used to carry.
      /** @type {import('@playwright/test').Locator} The sidebar check header's info row. */
      const headerInfo = itemSheet.locator('.sidebar-check .header .info').first();
      await expect(headerInfo, 'sidebar header renders the attribute/skill/DC row').not.toHaveText('');
```

with:

```javascript
      // As the GM (an owner of every item) the sidebar header renders the condensed roll button in
      // place of the static info line; the attribute/skill/DC the hidden tag used to carry now live
      // on the button and its tooltip.
      /** @type {import('@playwright/test').Locator} The sidebar check header's roll button. */
      const headerRoll = itemSheet.locator('.sidebar-check .header .roll button').first();
      await expect(headerRoll, 'sidebar header renders the roll button for an owner').toBeVisible();
```

- [ ] **Step 2: Refresh the surrounding comments**

Update the file's two descriptive comments that claim the sidebar header carries the attribute/skill/DC (the header docblock around lines 50-54 and the inline comment at the top of the item-sheet branch around line 340) to state that, for a user who can roll, the header carries the roll button instead, while the hidden basics remain on the button/tooltip. Keep the CheckTags parity description unchanged.

- [ ] **Step 3: Note — run during the e2e task**

This spec is world-launch-gated and is executed in Task 9's run. No standalone command here.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/embedded-context-check-parity.spec.js
git commit -m "test: parity spec expects the sidebar roll button for an owner"
```

---

### Task 8: New e2e — GM positive path across all three sheets and surfaces

Seeds one player actor owning an equipment item (item check), a weapon (two attacks), and a spell (casting check). As the GM login, verifies the sidebar roll button renders (replacing the info line) and rolls the correct message subtype on each, that the settings-panel roll row renders, and that a weapon's second attack row targets attack index 1.

**Files:**
- Create: `tests/e2e/item-sheet-roll.spec.js`

- [ ] **Step 1: Write the spec**

```javascript
import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import {
   attachPageErrors,
   buildCheck,
   clearChat,
   closeAllApps,
   deleteFixtureActor,
   deleteOrphanedTokens,
   newestMessageType,
} from './world.js';

/**
 * Item-sheet check rolling (owner path): as the GM login (an owner of every item) the item sheet's
 * sidebar shows the condensed roll button in place of the static info line, and the editing settings
 * panels show a top roll-preview row. Clicking a button rolls through the parent actor's existing
 * request*Check path and posts the matching check subtype. Covers item checks (equipment), attacks
 * (weapon, two attacks for per-row index targeting), and the casting check (spell).
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Item Roll Actor';

/** @type {string} Label of the equipment item's seeded item check. */
const ITEM_CHECK_LABEL = 'E2E Roll Item Check';

/** @type {import('@playwright/test').Page} The file-shared, logged-in GM page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test. */
let errors;
/** @type {{equipmentId: string, weaponId: string, spellId: string}} Seeded document ids. */
let ids;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
   await deleteOrphanedTokens(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

test.describe('item-sheet check rolling (owner)', () => {
   test.beforeEach(async () => {
      /** @type {boolean} Whether the TITAN system finished initializing in the shared page. */
      const systemReady = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(systemReady, `TITAN system failed to initialize.\n${errors.join('\n')}`).toBe(true);

      await deleteFixtureActor(page, ACTOR_NAME);

      ids = await page.evaluate(async ({ actorName, itemCheck }) => {
         const actor = await Actor.create({ name: actorName, type: 'player' });
         const [equipment] = await actor.createEmbeddedDocuments('Item', [
            { name: 'E2E Roll Equipment', type: 'equipment', system: { check: [itemCheck] } },
         ]);
         const [weapon] = await actor.createEmbeddedDocuments('Item', [
            {
               name: 'E2E Roll Weapon',
               type: 'weapon',
               system: {
                  attack: [
                     { label: 'E2E Roll Attack One', attribute: 'body', skill: 'meleeWeapons', type: 'melee' },
                     { label: 'E2E Roll Attack Two', attribute: 'mind', skill: 'rangedWeapons', type: 'ranged' },
                  ],
               },
            },
         ]);
         const [spell] = await actor.createEmbeddedDocuments('Item', [
            { name: 'E2E Roll Spell', type: 'spell' },
         ]);

         // Roll straight to chat: no options dialog.
         await game.settings.set('titan', 'getCheckOptions', false);

         return { equipmentId: equipment.id, weaponId: weapon.id, spellId: spell.id };
      }, {
         actorName: ACTOR_NAME,
         itemCheck: buildCheck(ITEM_CHECK_LABEL, 'e2e-roll-item-check'),
      });
   });

   test.afterEach(async () => {
      await page.evaluate(async () => {
         await game.settings.set('titan', 'getCheckOptions', false);
      });
   });

   test.afterAll(async () => {
      await deleteFixtureActor(page, ACTOR_NAME);
   });

   /**
    * Opens an item's sheet by id and waits for the Svelte mount.
    * @param {string} itemId - The embedded item's id.
    * @returns {Promise<import('@playwright/test').Locator>} The item-sheet application root locator.
    */
   async function openItemSheet(itemId) {
      await closeAllApps(page);
      await page.evaluate(async ({ actorName, id }) => {
         const item = game.actors.getName(actorName).items.get(id);
         const app = await item.sheet.render(true);
         await titanWait(
            () => !!app?.element?.querySelector('.window-content')?.children.length,
            { message: 'item sheet mounted' },
         );
      }, { actorName: ACTOR_NAME, id: itemId });
      return page.locator('.application.titan-document-sheet');
   }

   test('equipment sidebar roll button posts an itemCheck', async () => {
      const sheet = await openItemSheet(ids.equipmentId);

      /** @type {import('@playwright/test').Locator} The sidebar roll button. */
      const button = sheet.locator('.sidebar-check .header .roll button').first();
      await expect(button, 'sidebar roll button renders for the owner').toBeVisible();

      /** @type {number} The world message count before the roll. */
      const before = await page.evaluate(() => game.messages.size);
      await button.click();
      await expect
         .poll(() => newestMessageType(page, before), { message: 'roll posts an itemCheck' })
         .toBe('itemCheck');

      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('weapon sidebar second attack row targets attack index 1 and posts an attackCheck', async () => {
      const sheet = await openItemSheet(ids.weaponId);

      /** @type {import('@playwright/test').Locator} The roll buttons, one per attack row, in order. */
      const buttons = sheet.locator('.sidebar-check .header .roll button');
      await expect(buttons, 'both attack rows render a roll button').toHaveCount(2);

      /** @type {number} The world message count before the roll. */
      const before = await page.evaluate(() => game.messages.size);
      await buttons.nth(1).click();
      await expect
         .poll(() => newestMessageType(page, before), { message: 'second attack posts an attackCheck' })
         .toBe('attackCheck');

      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('spell sidebar casting button posts a castingCheck', async () => {
      const sheet = await openItemSheet(ids.spellId);

      /** @type {import('@playwright/test').Locator} The casting sidebar roll button. */
      const button = sheet.locator('.sidebar-check .header .roll button').first();
      await expect(button, 'casting roll button renders for the owner').toBeVisible();

      /** @type {number} The world message count before the roll. */
      const before = await page.evaluate(() => game.messages.size);
      await button.click();
      await expect
         .poll(() => newestMessageType(page, before), { message: 'roll posts a castingCheck' })
         .toBe('castingCheck');

      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('equipment check settings panel shows the roll-preview row', async () => {
      const sheet = await openItemSheet(ids.equipmentId);

      // Activate the Checks tab, then expand the seeded check's settings.
      await sheet.getByText('Checks', { exact: true }).first().click();

      /** @type {import('@playwright/test').Locator} The check settings panel header (expands on click). */
      const header = sheet.locator('.check .header').first();
      await expect(header, 'check settings header renders').toBeVisible();
      await header.locator('button').first().click();

      /** @type {import('@playwright/test').Locator} The roll-preview button inside the expanded panel. */
      const previewButton = sheet.locator('.check .expandable-content .check-button button').first();
      await expect(previewButton, 'settings panel shows the roll-preview button').toBeVisible();

      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});
```

- [ ] **Step 2: Note — run in Task 9**

The e2e suite is world-launch-gated (the user launches the world). Both new specs and the parity update run together in Task 9.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/item-sheet-roll.spec.js
git commit -m "test: e2e item-sheet roll button owner path (item/weapon/spell)"
```

---

### Task 9: New e2e — gating (Player login: present when owned, absent when only observed) + run the suite

Logs in as `E2E Player 1`. Seeds one actor that player owns (button present) and one the player only observes (button absent → static info line). This is the presence→absence pair the gating requires on the same surface. Then runs the affected e2e specs.

**Files:**
- Create: `tests/e2e/item-sheet-roll-gating.spec.js`

- [ ] **Step 1: Write the spec**

```javascript
import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import {
   attachPageErrors,
   buildCheck,
   clearChat,
   closeAllApps,
   deleteFixtureActor,
} from './world.js';
import { PLAYER_USERS } from './users.js';

/**
 * Item-sheet roll-button gating (player perspective): logged in as a non-GM player, an item the
 * player's character OWNS shows the sidebar roll button (replacing the info line), while an item on
 * an actor the player only OBSERVES shows the static info line and no button. The resolveRollActor
 * unit test locks the decision logic deterministically; this spec proves the gate end-to-end on the
 * rendered sheet from a real non-GM seat.
 */

/** @type {string} Name of the actor this player owns. */
const OWNED_ACTOR_NAME = 'E2E Player-Owned Roll Actor';

/** @type {string} Name of the actor this player can only observe. */
const OBSERVED_ACTOR_NAME = 'E2E Observed Roll Actor';

/** @type {string} Label shared by both seeded item checks. */
const ITEM_CHECK_LABEL = 'E2E Gating Item Check';

/** @type {import('@playwright/test').Page} The file-shared, player-logged-in page. */
let page;
/** @type {string[]} Uncaught page errors collected during the current test. */
let errors;
/** @type {{ownedItemId: string, observedItemId: string}} Seeded item ids. */
let ids;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page, PLAYER_USERS[0].name);
   await clearChat(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

test.describe('item-sheet roll-button gating (player)', () => {
   test.beforeEach(async () => {
      await deleteFixtureActor(page, OWNED_ACTOR_NAME);
      await deleteFixtureActor(page, OBSERVED_ACTOR_NAME);

      ids = await page.evaluate(async ({ ownedName, observedName, playerName, itemCheck }) => {
         /** @type {User} The logged-in player whose ownership the fixtures encode. */
         const player = game.users.getName(playerName);
         const OWNER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
         const OBSERVER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;

         // Actor this player OWNS.
         const owned = await Actor.create({
            name: ownedName,
            type: 'player',
            ownership: { default: OBSERVER, [player.id]: OWNER },
         });
         const [ownedItem] = await owned.createEmbeddedDocuments('Item', [
            { name: 'E2E Owned Roll Equipment', type: 'equipment', system: { check: [itemCheck] } },
         ]);

         // Actor this player can only OBSERVE (default observer; player is NOT an owner).
         const observed = await Actor.create({
            name: observedName,
            type: 'player',
            ownership: { default: OBSERVER },
         });
         const [observedItem] = await observed.createEmbeddedDocuments('Item', [
            { name: 'E2E Observed Roll Equipment', type: 'equipment', system: { check: [itemCheck] } },
         ]);

         return { ownedItemId: ownedItem.id, observedItemId: observedItem.id };
      }, {
         ownedName: OWNED_ACTOR_NAME,
         observedName: OBSERVED_ACTOR_NAME,
         playerName: PLAYER_USERS[0].name,
         itemCheck: buildCheck(ITEM_CHECK_LABEL, 'e2e-gating-item-check'),
      });
   });

   test.afterAll(async () => {
      await deleteFixtureActor(page, OWNED_ACTOR_NAME);
      await deleteFixtureActor(page, OBSERVED_ACTOR_NAME);
   });

   /**
    * Opens an item's sheet by actor + item id and waits for the Svelte mount.
    * @param {string} actorName - The owning actor's name.
    * @param {string} itemId - The embedded item's id.
    * @returns {Promise<import('@playwright/test').Locator>} The item-sheet application root locator.
    */
   async function openItemSheet(actorName, itemId) {
      await closeAllApps(page);
      await page.evaluate(async ({ name, id }) => {
         const item = game.actors.getName(name).items.get(id);
         const app = await item.sheet.render(true);
         await titanWait(
            () => !!app?.element?.querySelector('.window-content')?.children.length,
            { message: 'item sheet mounted' },
         );
      }, { name: actorName, id: itemId });
      return page.locator('.application.titan-document-sheet');
   }

   test('owned item shows the roll button (presence)', async () => {
      const sheet = await openItemSheet(OWNED_ACTOR_NAME, ids.ownedItemId);

      await expect(
         sheet.locator('.sidebar-check .header .roll button').first(),
         'owned item shows the roll button',
      ).toBeVisible();
      await expect(
         sheet.locator('.sidebar-check .header .info').first(),
         'owned item hides the static info line',
      ).toHaveCount(0);

      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('observed-only item shows the static info line and no button (absence)', async () => {
      const sheet = await openItemSheet(OBSERVED_ACTOR_NAME, ids.observedItemId);

      // PRESENCE first: the sidebar check renders at all.
      await expect(
         sheet.locator('.sidebar-check .header .info').first(),
         'observed item renders the static info line',
      ).toBeVisible();
      // ABSENCE: no roll button on the same surface.
      await expect(
         sheet.locator('.sidebar-check .header .roll button'),
         'observed item shows no roll button',
      ).toHaveCount(0);

      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});
```

- [ ] **Step 2: Ask the user to launch the world, then run the affected specs**

The e2e suite requires the Foundry world to be launched (the user does this). Once launched, run the three affected specs:

Run: `npx playwright test tests/e2e/item-sheet-roll.spec.js tests/e2e/item-sheet-roll-gating.spec.js tests/e2e/embedded-context-check-parity.spec.js`
Expected: all PASS.

- [ ] **Step 3: Run the two specs that assert on the sidebar header to confirm no regression**

Run: `npx playwright test tests/e2e/attack-tags.spec.js tests/e2e/sheet-regressions.spec.js`
Expected: all PASS (these assert on `.sidebar-check .header` / `.sidebar-check`, which still render).

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/item-sheet-roll-gating.spec.js
git commit -m "test: e2e item-sheet roll-button gating from a player seat"
```

---

### Task 10: Full verification and documentation

**Files:**
- Modify: `.claude/skills/titan-codebase/references/*.md` (the file documenting check components / sheet contexts)
- Modify: `docs/TODO.md` (only if any follow-up is deferred)

- [ ] **Step 1: Full unit suite**

Run: `npm test`
Expected: all unit tests pass, including the new `ResolveRollActor.test.js`.

- [ ] **Step 2: Production build is clean**

Run: `npm run build`
Expected: build succeeds with no warnings about the moved components.

- [ ] **Step 3: Full e2e suite (user launches the world)**

Run: `npm run test:e2e`
Expected: the full suite passes (no regressions from the relocation or the sidebar swap).

- [ ] **Step 4: Update the `titan-codebase` skill**

Reflect the current state (not a changelog):
- The three condensed check buttons live at `src/document/svelte-components/check/Condensed{Item,Attack,Casting}CheckButton.svelte`, are index-aware (`idx` prop), and read the rolling actor from the `rollActor` context.
- `DocumentSheetShell` publishes the `rollActor` context (the actor on an actor sheet; the parent character actor on an owned item sheet whose user is an owner/GM; otherwise undefined), resolved by `src/document/reactive/ResolveRollActor.js`.
- `SidebarCheck` accepts an optional `rollButton` snippet that replaces the header info line; item-sheet sidebars and check settings panels render the condensed roll button when `rollActor` is present.

- [ ] **Step 5: Log any deferred follow-up (only if one exists)**

If anything was deferred, add it to `docs/TODO.md`. No open bug is created by this work; do not add a bug entry.

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/titan-codebase docs/TODO.md
git commit -m "docs: record item-sheet roll button + rollActor context"
```

---

## Self-Review

**Spec coverage:**
- Roll button on item-sheet sidebar, replacing the info line, gated → Tasks 4, 5 (+ helper 1, shell 2).
- Button added as a row to item check / weapon attack / spell casting settings → Task 6.
- Visible only when the user owns the actor or is GM; otherwise unchanged display → Tasks 1, 2 (`resolveRollActor` via `isOwner`), proven in Task 9.
- Identical roll behavior (dialog/straight-to-chat, player or NPC parent) → reuse of `request*Check` in Task 3 buttons; verified Task 8.
- One shared button set for both sheets → Task 3 relocation + `rollActor` context.
- Per-row targeting (`checkIdx`/`attackIdx`) → Task 3 `idx` prop; verified Task 8 (weapon attack 1).
- Existing parity spec adjusted for the swap → Task 7.
- Docs updated → Task 10.

**Placeholder scan:** No TBD/TODO/"handle edge cases" placeholders; every code step contains full content.

**Type consistency:** Component names `Condensed{Item,Attack,Casting}CheckButton`, prop `idx`, context key `rollActor`, helper `resolveRollActor`, snippet prop `rollButton`, and the `.roll` CSS class are used identically across all tasks. Message subtypes `itemCheck` / `attackCheck` / `castingCheck` match `src/check/types/*`. Option keys `checkIdx` / `attackIdx` match the option factories.
