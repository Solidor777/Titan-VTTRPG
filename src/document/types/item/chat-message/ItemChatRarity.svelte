<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   // Chat-message system snapshot reference.
   const system = document.data.system;
</script>

<div class="tag {system.rarity}">
   {localize(system.rarity)}
</div>

<style lang="scss">
   .tag {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include rarity-colors;

      font-weight: bold;

      @include padding-large;
   }
</style>
