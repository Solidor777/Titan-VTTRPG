<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';

   // Chat context reference
   const document = getContext('document');
   const titanFlags = $document.flags.titan;
</script>

<div class="tag {titanFlags.system.rarity}">
   {localize(titanFlags.system.rarity)}
</div>

<style lang="scss">
   .tag {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include rarity-colors;

      font-weight: bold;
      padding: var(--titan-padding-standard);
   }
</style>
