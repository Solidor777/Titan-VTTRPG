<script>
   /** @type number[] Options for the Select svelte-components. */
   export let options = void 0;

   /** @type number The value that this input should modify. */
   export let value = void 0;

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;
</script>

<select bind:value {disabled} on:change>
   {#each options as option}
      <option value={option}>
         {option}
      </option>
   {/each}
</select>

<style lang="scss">
   select {
      @include input;

      option {
         @include flex-group-left;

         background: var(--titan-input-background);
      }
   }
</style>
