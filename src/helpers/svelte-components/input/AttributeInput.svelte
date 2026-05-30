<script>
   /**
    * @typedef {object} AttributeInputProps
    * @property {string} [attribute] - The Attribute to use for coloring this element.
    * @property {import('svelte').Snippet} [children] - Child content to render inside the wrapper.
    */

   /** @type {AttributeInputProps} */
   let {
      attribute = void 0,
      children = void 0,
   } = $props();
</script>

<div class="attribute-input {attribute}">
   {@render children?.()}
</div>

<style lang="scss">
   .attribute-input {
      @include attribute-input;
   }
</style>
