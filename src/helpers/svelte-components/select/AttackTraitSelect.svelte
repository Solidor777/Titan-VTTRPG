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
         label: localize('blast'),
         value: 'blast',
      },
      {
         label: localize('cleave'),
         value: 'cleave',
      },
      {
         label: localize('close'),
         value: 'close',
      },
      {
         label: localize('crushing'),
         value: 'crushing',
      },
      {
         label: localize('ineffective'),
         value: 'ineffective',
      },
      {
         label: localize('loud'),
         value: 'loud',
      },
      {
         label: localize('magical'),
         value: 'magical',
      },
      {
         label: localize('flurry'),
         value: 'flurry',
      },
      {
         label: localize('penetrating'),
         value: 'penetrating',
      },
      {
         label: localize('piercing'),
         value: 'piercing',
      },
      {
         label: localize('reload'),
         value: 'reload',
      },
      {
         label: localize('rend'),
         value: 'rend',
      },
      {
         label: localize('restraining'),
         value: 'restraining',
      },
      {
         label: localize('slashing'),
         value: 'slashing',
      },
      {
         label: localize('splash'),
         value: 'splash',
      },
      {
         label: localize('twoHanded'),
         value: 'twoHanded',
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
