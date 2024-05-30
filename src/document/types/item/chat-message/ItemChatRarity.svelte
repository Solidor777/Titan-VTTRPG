<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';

   // Chat context reference
   const document = getContext('document');
   const chatContext = $document.flags.titan;
</script>

<div class="tag {chatContext.system.rarity}">
   {localize(chatContext.system.rarity)}
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
