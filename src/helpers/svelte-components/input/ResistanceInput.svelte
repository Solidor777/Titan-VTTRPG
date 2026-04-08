<script xmlns="http://www.w3.org/1999/html">

   /** @type {string} - The Resistance to use for coloring this element. */
   export let resistance = void 0;
</script>

<div class="resistance-input {resistance}">
   <slot></slot>
</div>

<style lang="scss">
   .resistance-input {
      @include resistance-input;
   }
</style>
