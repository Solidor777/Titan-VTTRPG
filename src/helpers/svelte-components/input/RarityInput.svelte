<script xmlns="http://www.w3.org/1999/html">

   /** @type {string} The Rarity to use for coloring this element. */
   export let rarity = void 0;
</script>

<div class="rarity-input {rarity}">
   <slot></slot>
</div>

<style lang="scss">
   .rarity-input {
      @include rarity-input;
   }
</style>
