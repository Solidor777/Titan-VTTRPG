<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Select from '~/helpers/svelte-components/select/Select.svelte';

   // Value
   export let value = void 0;

   // Whether to allow none
   export let allowNone = false;

   export let disabled = false;

   // Options
   const options = [
      {
         label: localize('magical'),
         value: 'magical',
      },
      {
         label: localize('loud'),
         value: 'loud',
      },
      {
         label: localize('encumbering'),
         value: 'encumbering',
      },
      {
         label: localize('heavy'),
         value: 'heavy',
      },
   ];

   // Add none option
   if (allowNone) {
      skillOptions.push({
         label: localize('none'),
         value: 'none',
      });
   }
</script>

<Select {options} bind:value {disabled} on:change />
