<script>
   import localize from '~/helpers/utility-functions/Localize.js';

   /** @type {string} The value that this input should modify. */
   export let value = void 0;

   /** @type {boolean} Whether to allow None as an option. */
   export let allowNone = false;

   /** @type {boolean} Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type SelectOption[] Options for the Select svelte component. */
   const options = [
      {
         label: localize('reflexes'),
         value: 'reflexes',
      },
      {
         label: localize('resilience'),
         value: 'resilience',
      },
      {
         label: localize('willpower'),
         value: 'willpower',
      },
   ];

   // Add None option if appropriate.
   if (allowNone) {
      options.push({
         label: localize('none'),
         value: 'none',
      });
   }
</script>

<select
   bind:value
   class={value}
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
      @include resistance-input;
   }
</style>
