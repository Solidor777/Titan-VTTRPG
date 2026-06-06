<script>
   import EffectHudRow from '~/ui/effect-hud/EffectHudRow.svelte';
   import EmbeddedDocumentProvider from '~/document/reactive/EmbeddedDocumentProvider.svelte';

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
      <EmbeddedDocumentProvider doc={effect}>
         <EffectHudRow/>
      </EmbeddedDocumentProvider>
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
