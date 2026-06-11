<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import EmbeddedDocumentProvider from '~/document/reactive/EmbeddedDocumentProvider.svelte';
   import EffectsListRow from '~/ui/player-hud/elements/effects-panel/EffectsListRow.svelte';

   /**
    * @typedef {object} EffectsListPanelProps
    * @property {Array<TitanActiveEffect>} conditions - Condition-subtype effects on the actor.
    * @property {Array<TitanActiveEffect>} effects - Effect-subtype effects on the actor.
    */

   /** @type {EffectsListPanelProps} */
   const { conditions, effects } = $props();
</script>

{#if conditions.length > 0}
   <div class="section">
      <div class="section-title">{localize('conditions')}</div>
      {#each conditions as effect (effect.id)}
         <EmbeddedDocumentProvider doc={effect}>
            <EffectsListRow/>
         </EmbeddedDocumentProvider>
      {/each}
   </div>
{/if}

{#if effects.length > 0}
   <div class="section">
      <div class="section-title">{localize('effects')}</div>
      {#each effects as effect (effect.id)}
         <EmbeddedDocumentProvider doc={effect}>
            <EffectsListRow/>
         </EmbeddedDocumentProvider>
      {/each}
   </div>
{/if}

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
