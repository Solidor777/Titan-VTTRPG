<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Select from '~/helpers/svelte-components/select/Select.svelte';

   /** @type string The value to bind to the input. */
   export let value = void 0;

   /** @type boolean Whether to allow None as an option. */
   export let allowNone = false;

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type SelectOption[] Options for the Select. */
   const options = [
      {
         label: localize('burrow'),
         value: 'burrow',
      },
      {
         label: localize('climb'),
         value: 'climb',
      },
      {
         label: localize('fly'),
         value: 'fly',
      },
      {
         label: localize('stride'),
         value: 'stride',
      },
      {
         label: localize('swim'),
         value: 'swim',
      },
   ];

   // Add none option if appropriate.
   if (allowNone) {
      options.push({
         label: localize('none'),
         value: 'none',
      });
   }
</script>

<Select bind:value {disabled} on:change {options}/>
