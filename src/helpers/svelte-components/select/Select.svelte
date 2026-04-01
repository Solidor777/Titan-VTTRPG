<script>
   /**
    * @typedef {object} SelectOption
    * Object used to store data for an Option within a Select svelte component.
    * @property {*} value - The value for this option.
    * @property {string} label - The display label for this option.
    */

   /**
    * @typedef {SelectOption} Number
    * Object used to store data for a String Option within a Select svelte component.
    * @property {string} value - The value for this option.
    * @property {number} label - The display label for this option.
    */

   /**
    * @typedef {SelectOption} StringOption
    * Object used to store data for a Number Option within a Select svelte component.
    * @property {number} value - The value for this option.
    * @property {string} label - The display label for this option.
    */

   /** @type SelectOption[] Options for the Select svelte component. */
   export let options = void 0;

   /** @type * The value that this input should modify. */
   export let value = void 0;

   /** @type {boolean} Whether the input should currently be disabled. */
   export let disabled = false;
</script>

<select
   bind:value
   {disabled}
   on:change>
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
