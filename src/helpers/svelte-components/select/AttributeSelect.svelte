<script>
   import localize from '~/helpers/utility-functions/Localize.js';

   /** @type string The value that this input should modify. */
   export let value = void 0;

   /** @type boolean Whether to allow None as an option. */
   export let allowNone = false;

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type StringOption[] Options for the Select svelte component. */
   const options = [
      {
         label: localize('body'),
         value: 'body',
      },
      {
         label: localize('mind'),
         value: 'mind',
      },
      {
         label: localize('soul'),
         value: 'soul',
      },
   ];

   // Add none option if appropriate
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
      @include attribute-input;
   }
</style>
