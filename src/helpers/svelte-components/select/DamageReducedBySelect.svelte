<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Select from '~/helpers/svelte-components/select/Select.svelte';

   /** @type string The value that this input should modify. */
   export let value = void 0;

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type boolean Whether to allow Resistance Check as an option */
   export let allowResistanceCheck = void 0;

   /** @type boolean Whether to allow Opposed Check as an option */
   export let allowOpposedCheck = void 0;

   /** @type SelectOption[] Options for the Select. */
   const options = [
      {
         label: localize('none'),
         value: 'none',
      },
   ];

   // Add Resistance Check if appropriate.
   if (allowResistanceCheck) {
      options.push({
         label: localize('resistanceCheck'),
         value: 'resistanceCheck',
      });
   }

   // Add Opposed Check if appropriate.
   if (allowOpposedCheck) {
      options.push({
         label: localize('opposedCheck'),
         value: 'opposedCheck',
      });
   }
</script>

<Select bind:value {disabled} {options}/>
