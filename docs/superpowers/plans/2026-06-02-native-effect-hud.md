# Native Effect HUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per project `CLAUDE.md`, route all `.js` / `.svelte` / `.svelte.js` work to the `titan-svelte-dev` subagent with the `svelte-5`, `foundry-vtt`, and `foundry-svelte` skills loaded.

**Goal:** Ship a native, screen-level "Effect HUD" that lists the active actor's conditions and effects (with descriptions, durations, rollable embedded checks, and owner-gated send-to-chat/delete), replacing the third-party `visual-active-effects` module — then drop the VAE flag stamping.

**Architecture:** A singleton controller (`TitanEffectHud`) created on the `ready` hook mounts a Svelte tree into a fixed-position container, providing the active actor's `ReactiveDocument` bridge as the `document` context so existing effect leaf components (`CharacterSheetEffectChecks`, `RichText`, `DurationTag`, `DocumentOwnerIconButton`) are reused unchanged. A pure `resolveHudActor` ladder picks the tracked actor; reactivity to selection/assignment/scene changes is via Foundry hooks; effect CRUD and duration ticks flow through the bridge automatically.

**Tech Stack:** Foundry VTT v14 (ApplicationV2-era, but this HUD is a direct Svelte mount — no ApplicationV2), Svelte 5 runes, Vitest (unit), Playwright (e2e), SCSS (component-scoped + inline container styles).

**Spec:** `docs/superpowers/specs/2026-06-02-native-effect-hud-design.md`

---

## File structure

**Net-new directory `src/ui/effect-hud/`:**
- `ResolveHudActor.js` — pure actor-resolution ladder (unit-tested).
- `EffectHudState.svelte.js` — reactive UI state (`collapsed`), owned by the controller.
- `TitanEffectHud.js` — singleton controller: container, hooks, resolution, (un)mount.
- `EffectHudShell.svelte` — sets `document` context; renders `EffectHud`.
- `EffectHud.svelte` — root: derives condition/effect lists; header; collapsed icon grid vs sections.
- `EffectHudSection.svelte` — a titled group of rows.
- `EffectHudRow.svelte` — a compact row that expands to description + checks + controls.

**Modified:**
- `src/helpers/Settings/EffectHudEnabled.js` (new helper) + `src/system/SystemSettings.js` (register) + `lang/en.json` (i18n).
- `src/hooks/OnceReady.js` — construct + attach the controller.
- `src/document/types/active-effect/TitanActiveEffect.js` — drop VAE flag + dead `_enrichDescription`.
- `src/system/Conditions.js` — drop VAE flag key (keep `flags.titan`).

**Tests:**
- `tests/unit/ResolveHudActor.test.js`
- `tests/e2e/effect-hud.spec.js`

---

## Task 1: `enableEffectHud` client setting + helper + i18n

**Files:**
- Create: `src/helpers/Settings/EffectHudEnabled.js`
- Modify: `src/system/SystemSettings.js` (add a `game.settings.register` block alongside the others, e.g. after the `confirmDeletingEffects` block at lines 27-34)
- Modify: `lang/en.json` (add a `SETTINGS.enableEffectHud` entry mirroring `confirmDeletingEffects` at lines 647-650; add `LOCAL.collapse.text` / `LOCAL.expand.text` near the other `LOCAL` keys)

- [ ] **Step 1: Add the setting helper**

Create `src/helpers/Settings/EffectHudEnabled.js`:

```javascript
import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Reads whether the native Effect HUD is enabled.
 * @returns {boolean} True if the HUD should be shown.
 */
export default function effectHudEnabled() {
   return getSetting('enableEffectHud');
}
```

- [ ] **Step 2: Register the setting**

In `src/system/SystemSettings.js`, add after the `confirmDeletingEffects` registration (after line 34):

```javascript
   // Enable the native Effect HUD.
   game.settings.register('titan', 'enableEffectHud', {
      config: true,
      default: true,
      hint: 'SETTINGS.enableEffectHud.hint',
      name: 'SETTINGS.enableEffectHud.text',
      scope: 'client',
      type: Boolean,
      onChange: () => game.titan?.effectHud?.refresh(),
   });
```

- [ ] **Step 3: Add localization entries**

In `lang/en.json`, inside the `"SETTINGS"` object (after the `confirmDeletingEffects` entry, line 650), add:

```json
      "enableEffectHud": {
         "label": "Enable Effect HUD",
         "hint": "If true, a panel listing the active character's conditions and effects is shown on screen, replacing the Visual Active Effects module."
      },
```

In `lang/en.json`, inside the `"LOCAL"` object, add (keep alphabetical placement near existing keys):

```json
      "collapse.text": "Collapse",
      "expand.text": "Expand",
```

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no errors referencing `enableEffectHud` or the new helper.

- [ ] **Step 5: Commit**

```bash
git add src/helpers/Settings/EffectHudEnabled.js src/system/SystemSettings.js lang/en.json
git commit -m "feat(effect-hud): add enableEffectHud client setting + i18n (#3)"
```

---

## Task 2: Pure `resolveHudActor` ladder + unit tests

**Files:**
- Create: `src/ui/effect-hud/ResolveHudActor.js`
- Test: `tests/unit/ResolveHudActor.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/ResolveHudActor.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import resolveHudActor from '~/ui/effect-hud/ResolveHudActor.js';

/**
 * Builds a minimal mock actor for resolution tests.
 * @param {string} id - The actor id.
 * @param {boolean} [isOwner] - Whether the user owns the actor.
 * @returns {{ id: string, isOwner: boolean }} The mock actor.
 */
function actor(id, isOwner = true) {
   return { id, isOwner };
}

describe('resolveHudActor', () => {
   it('returns the first selected token for a GM', () => {
      const a = actor('a');
      const b = actor('b');
      expect(resolveHudActor({ isGM: true, selected: [a, b], owned: [], assigned: null })).toBe(a);
   });

   it('returns null for a GM with nothing selected', () => {
      expect(resolveHudActor({ isGM: true, selected: [], owned: [], assigned: null })).toBe(null);
   });

   it('prefers a selected token that is the assigned character', () => {
      const assigned = actor('assigned');
      const other = actor('other');
      expect(resolveHudActor({
         isGM: false,
         selected: [other, assigned],
         owned: [other, assigned],
         assigned,
      })).toBe(assigned);
   });

   it('falls back to a selected owned token when none is the assigned character', () => {
      const assigned = actor('assigned');
      const selected = actor('selected');
      expect(resolveHudActor({
         isGM: false,
         selected: [selected],
         owned: [selected],
         assigned,
      })).toBe(selected);
   });

   it('returns the assigned character when an owned token of it exists but none is selected', () => {
      const assigned = actor('assigned');
      expect(resolveHudActor({
         isGM: false,
         selected: [],
         owned: [assigned],
         assigned,
      })).toBe(assigned);
   });

   it('returns the first owned token when nothing is selected or assigned-owned', () => {
      const owned = actor('owned');
      const assigned = actor('assigned');
      expect(resolveHudActor({
         isGM: false,
         selected: [],
         owned: [owned],
         assigned,
      })).toBe(owned);
   });

   it('returns the assigned character when no tokens exist on the scene', () => {
      const assigned = actor('assigned');
      expect(resolveHudActor({
         isGM: false,
         selected: [],
         owned: [],
         assigned,
      })).toBe(assigned);
   });

   it('returns null when nothing resolves', () => {
      expect(resolveHudActor({
         isGM: false,
         selected: [],
         owned: [],
         assigned: null,
      })).toBe(null);
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ResolveHudActor.test.js`
Expected: FAIL — cannot resolve `~/ui/effect-hud/ResolveHudActor.js`.

- [ ] **Step 3: Write the implementation**

Create `src/ui/effect-hud/ResolveHudActor.js`:

```javascript
/**
 * Resolves which actor's effects the Effect HUD should display, via the user-specified
 * precedence ladder. Players prefer (in order) a selected token that is their assigned
 * character, then a selected token they own, then their assigned character if an owned
 * token of it is on the scene, then any owned token, then their assigned character even
 * with no token. GMs track only the first selected token.
 * @param {object} params - Resolution inputs.
 * @param {boolean} params.isGM - Whether the current user is a GM.
 * @param {Array<Actor>} params.selected - Character actors of selected tokens, in selection order.
 * @param {Array<Actor>} params.owned - Character actors the user owns on the scene, in placeable order.
 * @param {Actor | null} params.assigned - The user's assigned character, or null.
 * @returns {Actor | null} The actor to display, or null if none resolves.
 */
export default function resolveHudActor({ isGM, selected, owned, assigned }) {
   // GMs track only the first selected token.
   if (isGM) {
      return selected[0] ?? null;
   }

   // 1. A selected token that is the assigned character.
   const selectedAssigned = selected.find((actor) => actor.id === assigned?.id);
   if (selectedAssigned) {
      return selectedAssigned;
   }

   // 2. A selected token the user owns.
   const selectedOwned = selected.find((actor) => actor.isOwner);
   if (selectedOwned) {
      return selectedOwned;
   }

   // 3. The assigned character, when the user owns a token of it on the scene.
   if (assigned && owned.some((actor) => actor.id === assigned.id)) {
      return assigned;
   }

   // 4. Any owned token.
   if (owned.length > 0) {
      return owned[0];
   }

   // 5. The assigned character, even with no token on the scene.
   return assigned ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/ResolveHudActor.test.js`
Expected: PASS — all 8 cases green.

- [ ] **Step 5: Commit**

```bash
git add src/ui/effect-hud/ResolveHudActor.js tests/unit/ResolveHudActor.test.js
git commit -m "feat(effect-hud): pure resolveHudActor ladder + unit tests (#3)"
```

---

## Task 3: `EffectHudState` reactive UI state

**Files:**
- Create: `src/ui/effect-hud/EffectHudState.svelte.js`

- [ ] **Step 1: Write the state class**

Create `src/ui/effect-hud/EffectHudState.svelte.js`:

```javascript
/**
 * Reactive UI state for the Effect HUD. Owned by the controller so it survives the
 * unmount/remount cycle that happens when the tracked actor changes.
 * @class EffectHudState
 */
export default class EffectHudState {
   /** @type {boolean} Whether the panel is collapsed to an icon grid. */
   collapsed = $state(false);
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds (the `.svelte.js` rune compiles).

- [ ] **Step 3: Commit**

```bash
git add src/ui/effect-hud/EffectHudState.svelte.js
git commit -m "feat(effect-hud): reactive EffectHudState (#3)"
```

---

## Task 4: HUD Svelte components

**Files:**
- Create: `src/ui/effect-hud/EffectHudShell.svelte`
- Create: `src/ui/effect-hud/EffectHud.svelte`
- Create: `src/ui/effect-hud/EffectHudSection.svelte`
- Create: `src/ui/effect-hud/EffectHudRow.svelte`

These reuse existing leaf components by providing the actor `ReactiveDocument` bridge as the `document` context (set in the shell). Build all four, then verify the build.

- [ ] **Step 1: Create the shell (sets context)**

Create `src/ui/effect-hud/EffectHudShell.svelte`:

```svelte
<script>
   import { setContext } from 'svelte';
   import EffectHud from '~/ui/effect-hud/EffectHud.svelte';

   /**
    * @typedef {object} EffectHudShellProps
    * @property {object} documentStore - Reactive bridge around the active actor.
    * @property {EffectHudState} hudState - Shared HUD UI state.
    */

   /** @type {EffectHudShellProps} */
   const { documentStore, hudState } = $props();

   // Provide the actor bridge as the 'document' context so reused effect leaf components
   // (checks, description, owner-gated delete) resolve the active actor exactly as they
   // do inside the character sheet.
   setContext('document', documentStore);
</script>

<EffectHud {hudState}/>
```

- [ ] **Step 2: Create the root component**

Create `src/ui/effect-hud/EffectHud.svelte`:

```svelte
<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import EffectHudSection from '~/ui/effect-hud/EffectHudSection.svelte';

   /**
    * @typedef {object} EffectHudProps
    * @property {EffectHudState} hudState - Shared HUD UI state.
    */

   /** @type {EffectHudProps} */
   const { hudState } = $props();

   /** @type {object} Reactive bridge around the active actor. */
   const document = getContext('document');

   /** @type {Array<TitanActiveEffect>} Condition-subtype effects on the active actor. */
   const conditions = $derived(
      document.data.effects.filter((effect) => effect.type === 'condition'),
   );

   /** @type {Array<TitanActiveEffect>} Effect-subtype effects on the active actor. */
   const effects = $derived(
      document.data.effects.filter((effect) => effect.type === 'effect'),
   );

   /** @type {number} Total displayed entries; the panel hides entirely when zero. */
   const total = $derived(conditions.length + effects.length);
</script>

{#if total > 0}
   <div
      class="titan-effect-hud"
      class:collapsed={hudState.collapsed}
   >
      <!--Header-->
      <div class="header">
         <span class="actor-name">{document.data.name}</span>
         <button
            class="collapse-toggle"
            type="button"
            aria-label={localize(hudState.collapsed ? 'expand' : 'collapse')}
            onclick={() => hudState.collapsed = !hudState.collapsed}
         >
            <i class={hudState.collapsed ? 'fas fa-chevron-left' : 'fas fa-chevron-down'}></i>
         </button>
      </div>

      {#if hudState.collapsed}
         <!--Icon grid (conditions first, then effects)-->
         <div class="icon-grid">
            {#each [...conditions, ...effects] as effect (effect.id)}
               <button
                  class="grid-icon"
                  type="button"
                  title={effect.name}
                  aria-label={effect.name}
                  onclick={() => hudState.collapsed = false}
               >
                  <img
                     src={effect.img}
                     alt={effect.name}
                  />
               </button>
            {/each}
         </div>
      {:else}
         {#if conditions.length > 0}
            <EffectHudSection
               title={localize('conditions')}
               effects={conditions}
            />
         {/if}
         {#if effects.length > 0}
            <EffectHudSection
               title={localize('effects')}
               effects={effects}
            />
         {/if}
      {/if}
   </div>
{/if}

<style lang="scss">
   .titan-effect-hud {
      @include panel-1;
      @include flex-column;
      @include flex-group-top;
      @include padding-standard;

      width: 220px;
      max-height: 60vh;
      overflow-y: auto;
      pointer-events: auto;

      &.collapsed {
         width: auto;
      }

      .header {
         @include flex-row;
         @include flex-group-space-between;
         @include font-size-small;

         width: 100%;

         .actor-name {
            text-transform: uppercase;
         }

         .collapse-toggle {
            background: none;
            border: none;
            cursor: pointer;
            color: inherit;
         }
      }

      .icon-grid {
         @include flex-column;
         @include flex-group-top;

         .grid-icon {
            background: none;
            border: none;
            cursor: pointer;
            padding: 0;

            img {
               width: 32px;
               height: 32px;
               object-fit: contain;
            }
         }
      }
   }
</style>
```

- [ ] **Step 3: Create the section component**

Create `src/ui/effect-hud/EffectHudSection.svelte`:

```svelte
<script>
   import EffectHudRow from '~/ui/effect-hud/EffectHudRow.svelte';

   /**
    * @typedef {object} EffectHudSectionProps
    * @property {string} title - Localized section heading.
    * @property {Array<TitanActiveEffect>} effects - Effects to render in this section.
    */

   /** @type {EffectHudSectionProps} */
   const { title, effects } = $props();
</script>

<div class="section">
   <div class="section-title">{title}</div>
   {#each effects as effect (effect.id)}
      <EffectHudRow {effect}/>
   {/each}
</div>

<style lang="scss">
   .section {
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      &:not(:first-child) {
         @include margin-top-standard;
      }

      .section-title {
         @include font-size-small;

         width: 100%;
         text-transform: uppercase;
         opacity: 0.7;
      }
   }
</style>
```

- [ ] **Step 4: Create the row component**

Create `src/ui/effect-hud/EffectHudRow.svelte`:

```svelte
<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import DurationTag from '~/helpers/svelte-components/tag/DurationTag.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import DocumentOwnerIconButton from '~/document/svelte-components/DocumentOwnerIconButton.svelte';
   import CharacterSheetEffectChecks
      from '~/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffectChecks.svelte';
   import { DELETE_ICON, SEND_TO_CHAT_ICON } from '~/system/Icons.js';

   /**
    * @typedef {object} EffectHudRowProps
    * @property {TitanActiveEffect} effect - The effect or condition to render.
    */

   /** @type {EffectHudRowProps} */
   const { effect } = $props();

   /** @type {object} Reactive bridge around the active actor. */
   const document = getContext('document');

   /** @type {boolean} Whether this row is expanded to show its detail. */
   let isExpanded = $state(false);

   /** @type {boolean} Whether this entry is a full effect (vs an inert condition). */
   const isEffect = $derived(effect.type === 'effect');

   /** @type {string} The entry's description HTML, sourced per subtype. */
   const description = $derived(
      isEffect
         ? (document.data.effects.get(effect.id)?.description ?? '')
         : (document.data.effects.get(effect.id)?.flags?.titan?.description ?? ''),
   );

   /** @type {number} The effect's embedded-check count (conditions have none). */
   const checkLength = $derived(
      isEffect ? (document.data.effects.get(effect.id)?.system.check.length ?? 0) : 0,
   );

   /** @type {string} The effect's duration type (effects only). */
   const durationType = $derived(
      isEffect ? document.data.effects.get(effect.id)?.system.duration.type : 'permanent',
   );

   /** @type {number} The effect's remaining duration. */
   const durationRemaining = $derived(
      document.data.effects.get(effect.id)?.system.duration?.remaining,
   );
</script>

<div
   class="row"
   class:expanded={isExpanded}
>
   <!--Row header (click to expand)-->
   <button
      class="row-header"
      type="button"
      onclick={() => isExpanded = !isExpanded}
   >
      <img
         class="icon"
         src={effect.img}
         alt={effect.name}
      />
      <span class="name">{effect.name}</span>
      {#if isEffect && durationType !== 'permanent'}
         <span class="duration">
            <DurationTag
               type={durationType}
               remaining={durationRemaining}
            />
         </span>
      {/if}
   </button>

   {#if isExpanded}
      <!--Description-->
      {#if description !== '' && description !== '<p></p>'}
         <div class="description">
            <RichText value={description}/>
         </div>
      {/if}

      <!--Embedded checks-->
      {#if checkLength > 0}
         <div class="checks">
            <CharacterSheetEffectChecks {effect}/>
         </div>
      {/if}

      <!--Controls-->
      <div class="controls">
         {#if isEffect}
            <IconButton
               icon={SEND_TO_CHAT_ICON}
               label={localize('sendToChat')}
               tooltip={localize('sendToChat')}
               onclick={() => effect.sendToChat()}
            />
         {/if}
         <DocumentOwnerIconButton
            icon={DELETE_ICON}
            label={localize('deleteEffect')}
            tooltip={localize('deleteEffect')}
            onclick={() => document.data.system.requestEffectDeletion(effect.id)}
         />
      </div>
   {/if}
</div>

<style lang="scss">
   .row {
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      &.expanded {
         @include panel-2;
         @include padding-standard;
      }

      .row-header {
         @include flex-row;
         @include flex-group-center;

         width: 100%;
         background: none;
         border: none;
         cursor: pointer;
         color: inherit;

         .icon {
            width: 30px;
            height: 30px;
            object-fit: contain;
         }

         .name {
            @include margin-left-standard;

            flex: 1;
            text-align: left;
         }
      }

      .description,
      .checks {
         @include margin-top-standard;

         width: 100%;
      }

      .controls {
         @include flex-row;
         @include flex-group-right;
         @include margin-top-standard;

         width: 100%;
         gap: var(--titan-spacing-standard);
      }
   }
</style>
```

- [ ] **Step 5: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds; all four components compile, no missing-import errors.

- [ ] **Step 6: Lint the new components**

Run: `npm run stylelint -- src/ui/effect-hud/*.svelte`
Expected: no errors (no `:global` selectors; mixins resolve).

- [ ] **Step 7: Commit**

```bash
git add src/ui/effect-hud/EffectHudShell.svelte src/ui/effect-hud/EffectHud.svelte src/ui/effect-hud/EffectHudSection.svelte src/ui/effect-hud/EffectHudRow.svelte
git commit -m "feat(effect-hud): HUD Svelte components (shell/root/section/row) (#3)"
```

---

## Task 5: `TitanEffectHud` controller + wire into ready

**Files:**
- Create: `src/ui/effect-hud/TitanEffectHud.js`
- Modify: `src/hooks/OnceReady.js` (construct + attach the controller)

- [ ] **Step 1: Write the controller**

Create `src/ui/effect-hud/TitanEffectHud.js`:

```javascript
import { mount, unmount } from 'svelte';
import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';
import EffectHudShell from '~/ui/effect-hud/EffectHudShell.svelte';
import EffectHudState from '~/ui/effect-hud/EffectHudState.svelte.js';
import resolveHudActor from '~/ui/effect-hud/ResolveHudActor.js';
import effectHudEnabled from '~/helpers/Settings/EffectHudEnabled.js';

/**
 * Singleton controller for the native Effect HUD. Owns the fixed-position container, wires
 * the reactivity hooks, resolves the tracked actor, and mounts/unmounts the Svelte tree.
 * @class TitanEffectHud
 */
export default class TitanEffectHud {
   /** @type {HTMLElement | undefined} The fixed-position container appended to the UI. */
   #element;

   /** @type {object | undefined} The active Svelte mount handle. */
   #handle;

   /** @type {ReactiveDocument | undefined} Bridge around the currently-tracked actor. */
   #bridge;

   /** @type {string | undefined} The id of the currently-tracked actor. */
   #actorId;

   /** @type {EffectHudState} Shared HUD UI state, preserved across remounts. */
   #state = new EffectHudState();

   /**
    * Initializes the HUD: builds the container, wires reactivity hooks, and renders once.
    * @returns {void}
    */
   init() {
      // Build the fixed-position container above the players list.
      this.#element = window.document.createElement('div');
      this.#element.id = 'titan-effect-hud';
      this.#element.style.cssText = [
         'position: fixed',
         'right: 8px',
         'bottom: 96px',
         'z-index: 60',
         'display: flex',
         'flex-direction: column',
         'align-items: flex-end',
         'pointer-events: none',
      ].join(';');
      (window.document.getElementById('interface') ?? window.document.body).appendChild(this.#element);

      // Re-resolve the tracked actor whenever selection, assignment, or scene changes.
      Hooks.on('controlToken', () => this.refresh());
      Hooks.on('canvasReady', () => this.refresh());
      Hooks.on('updateUser', (user) => {
         if (user.id === game.user.id) {
            this.refresh();
         }
      });

      this.refresh();
   }

   /**
    * Resolves the active actor for the current user via the precedence ladder.
    * @returns {Actor | null} The actor whose effects should be shown, or null.
    */
   resolveActiveActor() {
      /**
       * @param {Actor | null | undefined} actor - The actor to test.
       * @returns {boolean} Whether the actor is a TITAN character actor.
       */
      const isCharacter = (actor) => actor?.system?.isCharacter === true;

      /** @type {Array<Actor>} Character actors of selected tokens, in selection order. */
      const selected = Array.from(canvas?.tokens?.controlled ?? [])
         .map((token) => token.actor)
         .filter(isCharacter);

      /** @type {Array<Actor>} Character actors the user owns on the scene. */
      const owned = Array.from(canvas?.tokens?.placeables ?? [])
         .map((token) => token.actor)
         .filter((actor) => isCharacter(actor) && actor.isOwner);

      /** @type {Actor | null} The user's assigned character, if it is a character actor. */
      const assigned = isCharacter(game.user.character) ? game.user.character : null;

      return resolveHudActor({ isGM: game.user.isGM, selected, owned, assigned });
   }

   /**
    * Reconciles the mounted HUD with the current setting and resolved actor.
    * @returns {void}
    */
   refresh() {
      // Honor the enable setting: unmount and stop if disabled.
      if (!effectHudEnabled()) {
         this.#unmount();
         return;
      }

      // Only remount when the tracked actor actually changes; within one actor the bridge
      // updates the HUD reactively for effect CRUD and duration ticks.
      const actor = this.resolveActiveActor();
      if ((actor?.id ?? null) === (this.#actorId ?? null)) {
         return;
      }
      this.#mountActor(actor);
   }

   /**
    * Mounts the HUD for the given actor, tearing down any previous mount first.
    * @param {Actor | null} actor - The actor to track, or null to clear the HUD.
    * @returns {void}
    */
   #mountActor(actor) {
      this.#unmount();
      if (!actor) {
         return;
      }

      this.#bridge = new ReactiveDocument(actor);
      this.#actorId = actor.id;
      this.#handle = mount(EffectHudShell, {
         target: this.#element,
         props: {
            documentStore: this.#bridge,
            hudState: this.#state,
         },
      });
   }

   /**
    * Unmounts the current HUD tree, if any.
    * @returns {void}
    */
   #unmount() {
      if (this.#handle) {
         unmount(this.#handle);
         this.#handle = undefined;
      }
      this.#bridge = undefined;
      this.#actorId = undefined;
   }
}
```

- [ ] **Step 2: Wire the controller into the ready hook**

In `src/hooks/OnceReady.js`, add the import at the top (after line 4):

```javascript
import TitanEffectHud from '~/ui/effect-hud/TitanEffectHud.js';
```

Then, replace the existing `// Register sub-hooks.` block (lines 36-37):

```javascript
   // Register sub-hooks.
   Hooks.on('hotbarDrop', onHotbarDrop);
```

with:

```javascript
   // Register sub-hooks.
   Hooks.on('hotbarDrop', onHotbarDrop);

   // Build and attach the native Effect HUD.
   game.titan.effectHud = new TitanEffectHud();
   game.titan.effectHud.init();
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds; controller and ready-hook wiring compile.

- [ ] **Step 4: Lint**

Run: `npm run eslint -- src/ui/effect-hud/TitanEffectHud.js src/hooks/OnceReady.js`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/ui/effect-hud/TitanEffectHud.js src/hooks/OnceReady.js
git commit -m "feat(effect-hud): controller + ready-hook wiring + game.titan.effectHud (#3)"
```

---

## Task 6: Drop the `visual-active-effects` flag stamping

**Files:**
- Modify: `src/document/types/active-effect/TitanActiveEffect.js` (remove the flag writes in `_preCreate` and `_preUpdate`; remove the now-dead `_enrichDescription`)
- Modify: `src/system/Conditions.js` (remove the VAE flag key; keep `flags.titan`)

Verified there are no other `visual-active-effects` readers and `_enrichDescription` has no other caller.

- [ ] **Step 1: Remove the `_preCreate` flag seeding**

In `src/document/types/active-effect/TitanActiveEffect.js`, delete the flag block in `_preCreate` (lines 66-73):

```javascript
         // Seed the Visual Active Effects description with the enriched native description.
         updateData.flags = {
            'visual-active-effects': {
               data: {
                  content: await this._enrichDescription(this.description),
               },
            },
         };

```

Leave the surrounding `showIcon` logic and the `this.updateSource(updateData)` call intact. Also update the `_preCreate` doc comment (lines 34-35) to drop the "seeds the Visual Active Effects description flag" clause:

```javascript
    * For the 'effect' subtype, captures initial document data and forces the status icon to always display.
```

- [ ] **Step 2: Remove the `_preUpdate` flag sync**

In the same file, delete the flag-sync block in `_preUpdate` (lines 99-106):

```javascript
      // Keep the Visual Active Effects description in sync when the native description changes for effects.
      if (this.type === 'effect' && typeof changes.description === 'string') {
         foundry.utils.setProperty(
            changes,
            'flags.visual-active-effects.data.content',
            await this._enrichDescription(changes.description),
         );
      }

```

Also update the `_preUpdate` doc comment (lines 82-84) to drop the VAE clause; the method now only delegates to `super._preUpdate` and returns its result. Since the body becomes just the `super` call + `retVal` return, keep the `async` signature and the `changes`/`options`/`user` params (override contract).

- [ ] **Step 3: Remove the dead `_enrichDescription` method**

In the same file, delete the entire `_enrichDescription` method (lines 15-30, including its JSDoc block). Confirm with a grep that no reference remains:

Run: `npx rg "_enrichDescription" src/`
Expected: no matches.

- [ ] **Step 4: Remove the condition VAE flag key**

In `src/system/Conditions.js`, change the flag block (lines 226-233) from:

```javascript
      // Set the flags for visual active effects.
      condition.flags = {
         titan: {
            description: description,
            type: 'condition',
         },
         'visual-active-effects.data.content': description,
      };
```

to:

```javascript
      // Set the titan flags carrying the condition's description and subtype. The HUD reads
      // flags.titan.description for conditions (which have no native description field).
      condition.flags = {
         titan: {
            description: description,
            type: 'condition',
         },
      };
```

Also update the `setupConditions` doc comment (lines 209-210) to drop "and visual-active-effects content flag".

- [ ] **Step 5: Verify the build + no VAE references remain**

Run: `npm run build`
Expected: build succeeds.

Run: `npx rg "visual-active-effects" src/`
Expected: no matches.

- [ ] **Step 6: Run the unit suite (regression)**

Run: `npm test`
Expected: PASS — the full unit suite is green (including the existing effect/condition tests and the new `ResolveHudActor` tests).

- [ ] **Step 7: Commit**

```bash
git add src/document/types/active-effect/TitanActiveEffect.js src/system/Conditions.js
git commit -m "refactor(effect-hud): drop visual-active-effects flag stamping (#3)"
```

---

## Task 7: E2E coverage

**Files:**
- Create: `tests/e2e/effect-hud.spec.js`

This requires the TITAN world to be **launched** (the user must have Foundry running with the e2e world). Mirrors the harness shape of `tests/e2e/effect-tray.spec.js` (`login` fixture, `page.evaluate` for in-world setup, `[data-testid]`/DOM locators).

> **Note:** the HUD's DOM root is `#titan-effect-hud` (set by the controller). The panel renders `<div class="titan-effect-hud">` only when the resolved actor has at least one effect or condition. E2E assertions target `#titan-effect-hud .titan-effect-hud`.

- [ ] **Step 1: Write the e2e spec**

Create `tests/e2e/effect-hud.spec.js`:

```javascript
import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';

test.describe('native effect HUD', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
      const ready = await page.evaluate(() => typeof game.titan?.effectHud !== 'undefined');
      expect(ready, 'TITAN effect HUD controller must be attached at ready').toBe(true);
   });

   test('renders conditions and effects for the assigned character', async ({ page }) => {
      // Create a player-owned character, assign it, give it one effect and toggle one condition.
      await page.evaluate(async () => {
         const actor = await Actor.create({ name: 'HUD Test Actor', type: 'player' });
         await game.user.update({ character: actor.id });
         await actor.createEmbeddedDocuments('ActiveEffect', [{
            name: 'HUD Test Effect',
            type: 'effect',
            description: '<p>HUD description body.</p>',
         }]);
         await actor.toggleStatusEffect('stunned');
         game.titan.effectHud.refresh();
      });

      // The panel mounts and shows both grouped sections.
      const panel = page.locator('#titan-effect-hud .titan-effect-hud');
      await expect(panel).toBeVisible();
      await expect(panel.getByText('HUD Test Effect')).toBeVisible();

      // Expanding the effect row reveals its description. Click the name text (inside the
      // row-header button) rather than the button by accessible name, since the row icon's
      // alt text duplicates the name and would make a by-name match ambiguous.
      await panel.getByText('HUD Test Effect').click();
      await expect(panel.getByText('HUD description body.')).toBeVisible();
   });

   test('hides when the assigned actor has no effects or conditions', async ({ page }) => {
      await page.evaluate(async () => {
         const actor = await Actor.create({ name: 'HUD Empty Actor', type: 'player' });
         await game.user.update({ character: actor.id });
         game.titan.effectHud.refresh();
      });
      // No .titan-effect-hud panel is rendered inside the container.
      await expect(page.locator('#titan-effect-hud .titan-effect-hud')).toHaveCount(0);
   });

   test('unmounts when the enableEffectHud setting is turned off', async ({ page }) => {
      await page.evaluate(async () => {
         const actor = await Actor.create({ name: 'HUD Toggle Actor', type: 'player' });
         await game.user.update({ character: actor.id });
         await actor.createEmbeddedDocuments('ActiveEffect', [{
            name: 'Toggle Effect',
            type: 'effect',
            description: '<p>Body.</p>',
         }]);
         game.titan.effectHud.refresh();
      });
      await expect(page.locator('#titan-effect-hud .titan-effect-hud')).toBeVisible();

      await page.evaluate(async () => {
         await game.settings.set('titan', 'enableEffectHud', false);
      });
      await expect(page.locator('#titan-effect-hud .titan-effect-hud')).toHaveCount(0);

      // Restore the default for suite hygiene.
      await page.evaluate(async () => {
         await game.settings.set('titan', 'enableEffectHud', true);
      });
   });
});
```

- [ ] **Step 2: Build for e2e and run the spec**

Run: `npm run build:e2e`
Then (with the world launched): `npm run test:e2e -- effect-hud`
Expected: the three tests pass. If they fail to reach the world, confirm with the user that the e2e world is launched (per the project's e2e convention, the suite needs Foundry running).

> If a selector/teardown detail needs adjustment against the live DOM, fix it here before committing — do not weaken assertions to force a pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/effect-hud.spec.js
git commit -m "test(effect-hud): e2e coverage for render/empty/setting-toggle (#3)"
```

---

## Task 8: Docs — codebase skill, TODO, final verification

**Files:**
- Modify: `.claude/skills/titan-codebase/references/architecture.md` (note `src/ui/effect-hud/` and the controller)
- Modify: `.claude/skills/titan-codebase/references/data-flow.md` (note the HUD mount/resolution flow)
- Modify: `docs/TODO.md` (mark backlog #3 complete; note VAE flag dropped)

- [ ] **Step 1: Update the codebase skill — architecture**

In `.claude/skills/titan-codebase/references/architecture.md`, add `src/ui/` to the directory layout description: a new top-level UI tree for screen-level (non-sheet, non-sidebar) Svelte mounts, currently holding `effect-hud/` — the native Effect HUD (`TitanEffectHud` singleton controller created on `ready`, mounting `EffectHudShell` into a fixed-position container; pure `ResolveHudActor` ladder; reuses the actor `ReactiveDocument` bridge as the `document` context).

- [ ] **Step 2: Update the codebase skill — data flow**

In `.claude/skills/titan-codebase/references/data-flow.md`, add a short section: the Effect HUD resolves the active actor via `resolveHudActor` (selection/ownership/assignment ladder; GM = first selected), rebuilds a `ReactiveDocument` bridge on actor change, and remounts; effect CRUD and duration ticks update through the bridge. Conditions render from `flags.titan.description`; effects from native `description`. Note that the `visual-active-effects` flag is no longer stamped (the HUD replaces it).

- [ ] **Step 3: Mark the backlog item complete**

In `docs/TODO.md`, under `### 3. Native visual-active-effects-style panel`, prepend a `**Status: COMPLETE.**` summary: native screen-level Effect HUD shipped (`src/ui/effect-hud/`), tracking the active actor via `resolveHudActor`; Conditions/Effects grouped sections; owner-gated send-to-chat + delete; rollable embedded checks; `enableEffectHud` client setting (default on). The `visual-active-effects` flag stamping and dead `_enrichDescription` were removed. Spec/plan: `docs/superpowers/specs/2026-06-02-native-effect-hud-design.md`, `docs/superpowers/plans/2026-06-02-native-effect-hud.md`. Covered by `tests/unit/ResolveHudActor.test.js` + `tests/e2e/effect-hud.spec.js`.

- [ ] **Step 4: Final full verification**

Run: `npm test`
Expected: full unit suite green.

Run: `npm run build`
Expected: build succeeds.

Run: `npm run eslint && npm run stylelint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/titan-codebase/references/architecture.md .claude/skills/titan-codebase/references/data-flow.md docs/TODO.md
git commit -m "docs(effect-hud): close backlog #3; sync codebase skill + TODO"
```

---

## Self-review notes (for the implementer)

- **Spec coverage:** every requirement maps to a task — setting (T1), resolution ladder (T2), state (T3), components incl. sections/checks/controls (T4), controller + reactivity hooks (T5), VAE-flag drop + dead-code retire (T6), tests (T2 unit, T7 e2e), docs (T8).
- **Type consistency:** the controller passes `{ documentStore, hudState }`; the shell consumes exactly those and sets `document` context; `EffectHud`/`EffectHudRow` read `getContext('document')`; `resolveHudActor` is called with `{ isGM, selected, owned, assigned }` in both the test and the controller.
- **Condition vs effect divergence:** descriptions differ by subtype (`description` vs `flags.titan.description`); duration/checks/send-to-chat are effect-only — handled in `EffectHudRow` via `isEffect`.
- **No remount churn within an actor:** `refresh()` early-returns when the resolved actor id is unchanged; the bridge handles in-actor reactivity.
```
