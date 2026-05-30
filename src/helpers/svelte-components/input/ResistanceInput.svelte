<script>
   /**
    * @typedef {object} ResistanceInputProps
    * @property {string} [resistance] - The Resistance to use for coloring this element.
    * @property {import('svelte').Snippet} [children] - Child content to render inside the wrapper.
    */

   /** @type {ResistanceInputProps} */
   let {
      resistance = void 0,
      children = void 0,
   } = $props();
</script>

<div class="resistance-input {resistance}">
   {@render children?.()}
</div>

<style lang="scss">
   .resistance-input {
      @include resistance-input;
   }
</style>
