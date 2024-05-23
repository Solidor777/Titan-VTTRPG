<script>
   import localize from '~/helpers/utility-functions/Localize.js';

   export let rarity = void 0;
</script>

<div class="tag {rarity}">
   {localize(rarity)}
</div>

<style lang="scss">
   .tag {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include label;
      @include rarity-colors;

      padding: var(--padding-standard);
      font-weight: bold;
   }
</style>
