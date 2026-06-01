<script>
   /**
    * @typedef {object} RarityInputProps
    * @property {string} [rarity] - The Rarity to use for coloring this element.
    * @property {import('svelte').Snippet} [children] - Child content to render inside the wrapper.
    * @property {string} [testId] - Optional stable selector applied as `data-testid` on the root element.
    */

   /** @type {RarityInputProps} */
   let {
      rarity = void 0,
      children = void 0,
      testId = void 0,
   } = $props();
</script>

<div class="rarity-input {rarity}" data-testid={testId}>
   {@render children?.()}
</div>

<style lang="scss">
   .rarity-input {
      @include rarity-input;
   }
</style>
