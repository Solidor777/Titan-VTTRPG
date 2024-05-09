<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Select from '~/helpers/svelte-components/select/Select.svelte';

   // Value
   export let value = void 0;
   export let disabled = false;

   // Whether to allow a resistance check option
   export let allowResistanceCheck = true;

   // Whether to allow an opposed check option
   export let allowOpposedCheck = true;

   // Options
   export let options = [
      {
         label: localize('none'),
         value: 'none',
      },
   ];

   // Allow resistance check option
   if (allowResistanceCheck) {
      options.push({
         label: localize('resistanceCheck'),
         value: 'resistanceCheck',
      });
   }

   // Allow opposed check option
   if (allowOpposedCheck) {
      options.push({
         label: localize('opposedCheck'),
         value: 'opposedCheck',
      });
   }
</script>

<div class="damage-reduced-by-select {value}" on:change>
   <Select {options} bind:value {disabled}/>
</div>
