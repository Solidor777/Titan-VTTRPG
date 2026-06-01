<script>
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';

   /**
    * @typedef {object} CheckDifficultySelectProps
    * @property {number} [value] - The value that this input should modify.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this element, if any.
    * @property {(event: Event) => void} [onchange] - Callback fired when the selected value changes.
    * @property {string} [testId] - Optional stable selector applied as `data-testid` on the root element.
    */

   /** @type {CheckDifficultySelectProps} */
   let {
      value = $bindable(void 0),
      disabled = void 0,
      tooltip = void 0,
      onchange = void 0,
      testId = void 0,
   } = $props();

   /** @type {number[]} Options for the select. */
   const options = [
      1,
      2,
      3,
      4,
      5,
      6
   ];
</script>

<Select
   bind:value
   {disabled}
   onchange={onchange}
   {options}
   {tooltip}
   testId={testId}
/>
