<script>
   import { localize } from '~/helpers/Utility.js';
   import Select from '~/helpers/svelte-components/select/Select.svelte';

   // Value
   export let value = void 0;
   export let disabled = false;

   // Options
   export let options = [
      {
         label: localize('none'),
         value: 'none',
      },
      {
         label: localize('resistanceCheck'),
         value: 'resistanceCheck',
      },
      {
         label: localize('opposedCheck'),
         value: 'opposedCheck',
      },
   ];
</script>

<div class="damage-reduced-by-select {value}" on:change>
   <Select {options} bind:value {disabled} />
</div>
