<script>
   /**
    * @typedef SelectOption
    * Object used to store data for an Option within a Select component.
    * @property {*} value The value for this option.
    * @property {string} label The display label for this option.
    * @augments {object}
    */

   /** @type SelectOption[] Options for the Select component. */
   export let options = void 0;

   /** @type number The value to bind to the input. */
   export let value = void 0;

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;
</script>

<select bind:value {disabled} on:change>
   {#each options as option}
      <option value={option.value}>
         {option.label}
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
