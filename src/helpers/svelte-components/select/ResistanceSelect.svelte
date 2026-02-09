<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Select from '~/helpers/svelte-components/select/Select.svelte';

   /** @type string The value that this input should modify. */
   export let value = void 0;

   /** @type boolean Whether to allow None as an option. */
   export let allowNone = false;

   /** @type boolean Whether the input should currently be disabled. */
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

<div class="resistance-select {value}" on:change>
   <Select bind:value {disabled} {options}/>
</div>

<style lang="scss">
   .resistance-select {
      @include resistance-input;
   }
</style>
