<script>
   /**
    * @typedef {object} CharacterSheetItemFooterProps
    * @property {import('svelte').Snippet} [children] Content rendered inside the footer.
    */

   /** @type {CharacterSheetItemFooterProps} */
   const { children } = $props();
</script>

<!--Footer-->
<div class="item-footer">
   {@render children?.()}
</div>

<style lang="scss">
   .item-footer {
      @include flex-row;
      @include flex-space-evenly;

      flex-wrap: wrap;

      @include font-size-small;

      font-weight: bold;
      width: 100%;
   }
</style>
