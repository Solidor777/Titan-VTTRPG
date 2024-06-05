<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Select from '~/helpers/svelte-components/select/Select.svelte';

   /** @type number The value to bind to the input. */
   export let value = void 0;

   /** @type boolean Whether to allow None as an option. */
   export let allowNone = false;

   /** @type boolean Whether the input is currently disabled. */
   export let disabled = false;

   /** @type SelectOption[] Options for the Select. */
   export let options = [
      {
         label: localize('armor'),
         value: 'armor',
      },
      {
         label: localize('damage'),
         value: 'damage',
      },
      {
         label: localize('healing'),
         value: 'healing',
      },
      {
         label: localize('resolveRegain'),
         value: 'resolveRegain',
      },
      {
         label: localize('woundRegain'),
         value: 'woundRegain',
      },
   ];

   // Add None option if appropriate.
   if (allowNone) {
      skillOptions.push({
         label: localize('none'),
         value: 'none',
      });
   }
</script>

<Select bind:value {disabled} on:change {options}/>
