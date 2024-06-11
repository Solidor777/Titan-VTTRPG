<script>
   /** @type number The value to bind to the input. */
   export let value = void 0;

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;
</script>

<input bind:value {disabled} on:change on:keyup/>

<style lang="scss">
   input {
      @include input;
   }
</style>
