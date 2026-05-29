<script>
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import { ARMOR_TRAITS } from '~/document/types/item/types/armor/ArmorTraits.js';

   /**
    * @typedef {object} ArmorTraitSelectProps
    * @property {string} [value] - The value that this input should modify.
    * @property {boolean} [allowNone] - Whether to allow None as an option.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this element, if any.
    * @property {(event: Event) => void} [onchange] - Callback fired when the selected value changes.
    */

   /** @type {ArmorTraitSelectProps} */
   let {
      value = $bindable(void 0),
      allowNone = false,
      disabled = false,
      tooltip = void 0,
      onchange = void 0,
   } = $props();

   /** @type {string[]} Options for the Select Svelte component, derived to include None when allowed. */
   const options = $derived.by(() => {
      const list = ARMOR_TRAITS.map((trait) => trait.name);
      if (allowNone) {
         list.push('none');
      }
      return list;
   });
</script>

<Select
   bind:value
   {disabled}
   on:change={onchange}
   {options}
   {tooltip}
/>
