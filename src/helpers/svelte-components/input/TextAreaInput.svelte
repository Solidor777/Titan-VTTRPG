<script>
   /** @type number The value to bind to the input. */
   export let value = void 0;

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;
</script>

<textarea bind:value {disabled} on:change/>

<style lang="scss">
   textarea {
      @include input;
      @include flex-row;
      @include flex-group-left;

      flex-wrap: wrap;
      width: 100%;
      height: 100%;
   }
</style>
