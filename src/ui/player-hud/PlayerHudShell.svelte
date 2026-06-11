<script>
   import { setContext } from 'svelte';
   import HudEditToolbar from '~/ui/player-hud/HudEditToolbar.svelte';
   import HudElementFrame from '~/ui/player-hud/HudElementFrame.svelte';
   import PortraitElement from '~/ui/player-hud/elements/portrait/PortraitElement.svelte';
   import ActionMenuElement from '~/ui/player-hud/elements/action-menu/ActionMenuElement.svelte';

   /**
    * @typedef {object} PlayerHudShellProps
    * @property {object} documentStore - Reactive bridge around the primary actor.
    * @property {Array<Actor>} actors - All resolved actors (group actions iterate these).
    * @property {HudLayoutState} layoutState - Shared layout/UI state.
    * @property {object} options - The effective Player HUD options snapshot.
    */

   /** @type {PlayerHudShellProps} */
   const { documentStore, actors, layoutState, options } = $props();

   // The primary actor bridge anchors all single-character reads; embedded providers chain off it.
   // The capture is intentional: the controller remounts the shell when the actor set changes.
   // svelte-ignore state_referenced_locally
   setContext('document', documentStore);
   // svelte-ignore state_referenced_locally
   setContext('sheetDocument', documentStore);

   /** @type {boolean} Whether exactly one character resolved (portrait/effects requirement). */
   const single = $derived(actors.length === 1);

   /**
    * Computes whether an element is visible under its enable + combat-only settings.
    * @param {string} elementKey - One of 'portrait', 'actionMenu', or 'effectsPanel'.
    * @returns {boolean} Whether the element should render.
    */
   function elementVisible(elementKey) {
      /** @type {object} The enable and combat-only settings for this element. */
      const elementOptions = options[elementKey];
      return elementOptions.enabled && (!elementOptions.combatOnly || layoutState.combatActive);
   }

   /** @type {boolean} Portrait visibility (single character only). */
   const portraitVisible = $derived(single && elementVisible('portrait'));

   /** @type {boolean} Action menu visibility (single or group). */
   const actionMenuVisible = $derived(elementVisible('actionMenu'));

   /** @type {boolean} Effects panel visibility (single character only). */
   const effectsPanelVisible = $derived(single && elementVisible('effectsPanel'));
</script>

{#if portraitVisible}
   <HudElementFrame
      elementKey="portrait"
      {layoutState}
      minimizeIcon="fas fa-user"
      testId="player-hud-portrait"
   >
      <PortraitElement options={options.portrait}/>
   </HudElementFrame>
{/if}

{#if actionMenuVisible}
   <HudElementFrame
      elementKey="actionMenu"
      {layoutState}
      minimizeIcon="fas fa-bars"
      testId="player-hud-action-menu"
   >
      <ActionMenuElement
         {actors}
         {layoutState}
         options={options.actionMenu}
      />
   </HudElementFrame>
{/if}

{#if effectsPanelVisible}
   <!-- TODO: mount the effects panel element. -->
{/if}

{#if layoutState.editMode}
   <HudEditToolbar {layoutState}/>
{/if}
