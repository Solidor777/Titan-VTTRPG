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
         @include flex-space-between;
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
