<script>
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import { RARITIES } from '~/system/Rarities.js';
   import RarityInput from '~/helpers/svelte-components/input/RarityInput.svelte';

   /** @type {string} The value that this input should modify. */
   export let value = void 0;

   /** @type {boolean} Whether the input should currently be disabled. */
   export let disabled = false;

   /**
    * @type {string | TooltipAction}
    * The Tooltip to display for this element, if any.
    */
   export let tooltip = void 0;

   /** @type {string[]}  Options for the Select Svelte component. */
   const options = structuredClone(RARITIES);
</script>

<RarityInput rarity={value}>
   <Select
      bind:value
      {disabled}
      on:change
      {options}
      {tooltip}
   />
</RarityInput>

