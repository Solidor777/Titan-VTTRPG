<script>
   import { localize } from '~/helpers/Utility.js';
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
