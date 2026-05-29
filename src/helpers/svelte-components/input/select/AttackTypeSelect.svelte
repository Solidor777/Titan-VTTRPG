<script>
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import { ATTACK_TYPES } from '~/system/AttackTypes.js';

   /**
    * @typedef {object} AttackTypeSelectProps
    * @property {string} [value] - The value that this input should modify.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this element, if any.
    * @property {(event: Event) => void} [onchange] - Callback fired when the selected value changes.
    */

   /** @type {AttackTypeSelectProps} */
   let {
      value = $bindable(void 0),
      disabled = false,
      tooltip = void 0,
      onchange = void 0,
   } = $props();

   /** @type {string[]} Options for the Select Svelte component. */
   const options = structuredClone(ATTACK_TYPES);
</script>

<Select
   bind:value
   {disabled}
   on:change={onchange}
   {options}
   {tooltip}
/>
