<script>
   import { getContext } from 'svelte';
   import EffectsListPanel from '~/ui/player-hud/elements/effects-panel/EffectsListPanel.svelte';
   import EffectsIconTray from '~/ui/player-hud/elements/effects-panel/EffectsIconTray.svelte';

   /**
    * @typedef {object} EffectsPanelElementProps
    * @property {object} options - The effectsPanel element options.
    * @property {HudLayoutState} layoutState - Shared layout/UI state (panel size, popout clamping).
    */

   /** @type {EffectsPanelElementProps} */
   const { options, layoutState } = $props();

   /** @type {object} The primary actor bridge. */
   const document = getContext('document');

   /** @type {Array<TitanActiveEffect>} Condition-subtype effects on the active actor. */
   const conditions = $derived(
      document.data.effects.filter((effect) => effect.type === 'condition'),
   );

   /** @type {Array<TitanActiveEffect>} Effect-subtype effects on the active actor. */
   const effects = $derived(
      document.data.effects.filter((effect) => effect.type === 'effect'),
   );
</script>

<div
   class="effects-panel"
   style:width={`${layoutState.effectsPanelSize.width}px`}
   style:height={`${layoutState.effectsPanelSize.height}px`}
>
   <!--Header-->
   <div class="header">
      <span class="actor-name">{document.data.name}</span>
   </div>

   <!--Scrolling style body-->
   <div class="body">
      {#if options.style === 'tray'}
         <EffectsIconTray
            {conditions}
            {effects}
            {layoutState}
         />
      {:else}
         <EffectsListPanel
            {conditions}
            {effects}
         />
      {/if}
   </div>
</div>

<style lang="scss">
   .effects-panel {
      @include panel-1;
      @include padding-standard;
      @include flex-column;
      @include flex-group-top;

      border-radius: var(--titan-border-radius);

      .header {
         @include flex-row;
         @include flex-space-between;
         @include font-size-small;

         width: 100%;

         .actor-name {
            text-transform: uppercase;
         }
      }

      .body {
         @include margin-top-standard;

         width: 100%;
         flex: 1;
         min-height: 0;
         overflow-y: auto;
      }
   }
</style>
