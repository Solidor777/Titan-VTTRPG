<script>
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import { RARITIES } from '~/system/Rarities.js';
   import RarityInput from '~/helpers/svelte-components/input/RarityInput.svelte';

   /**
    * @typedef {object} RaritySelectProps
    * @property {string} [value] - The value that this input should modify.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this element, if any.
    * @property {(event: Event) => void} [onchange] - Callback fired when the selected value changes.
    * @property {string} [testId] - Optional stable selector applied as `data-testid` on the root element.
    */

   /** @type {RaritySelectProps} */
   let {
      value = $bindable(void 0),
      disabled = false,
      tooltip = void 0,
      onchange = void 0,
      testId = void 0,
   } = $props();

   /** @type {string[]} Options for the Select Svelte component. */
   const options = structuredClone(RARITIES);
</script>

<RarityInput
   rarity={value}
   testId={testId}
>
   <Select
      bind:value
      {disabled}
      onchange={onchange}
      {options}
      {tooltip}
   />
</RarityInput>
