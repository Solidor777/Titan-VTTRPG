<script xmlns="http://www.w3.org/1999/html">

   /** @type {string} - The Attribute to use for coloring this element. */
   export let attribute = void 0;
</script>

<div class="attribute-input {attribute}">
   <slot></slot>
</div>

<style lang="scss">
   .attribute-input {
      @include attribute-input;
   }
</style>
