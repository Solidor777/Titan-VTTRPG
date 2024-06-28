<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import {ARMOR_TRAITS} from '~/document/types/item/types/armor/ArmorTraits.js';

   /** @type string The value that this input should modify. */
   export let value = void 0;

   /** @type boolean Whether to allow None as an option. */
   export let allowNone = false;

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type SelectOption[] Options for the Select. */
   const options = [];
   for (const trait of ARMOR_TRAITS) {
      options.push({
         value: trait.name,
         label: localize(trait.name),
      });
   }

   // Add none option if appropriate.
   if (allowNone) {
      options.push({
         label: localize('none'),
         value: 'none',
      });
   }
</script>

<Select bind:value {disabled} on:change {options}/>
