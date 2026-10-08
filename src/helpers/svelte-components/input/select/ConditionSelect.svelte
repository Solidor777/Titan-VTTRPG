<script>
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import { CONDITION_IDS } from '~/system/Conditions.js';

   /**
    * @typedef {object} ConditionSelectProps
    * @property {string} [value] - The value that this input should modify (a condition id).
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this element, if any.
    * @property {() => void} [onchange] - Callback fired when the selected value changes.
    * @property {string} [testId] - Optional stable selector applied as `data-testid` on the trigger.
    */

   /** @type {ConditionSelectProps} */
   let {
      value = $bindable(),
      disabled = false,
      tooltip = void 0,
      onchange = void 0,
      testId = void 0,
   } = $props();

   /** @type {string[]} The condition ids; each option's label localizes `LOCAL.<id>.text`. */
   const options = [...CONDITION_IDS];
</script>

<Select
   bind:value
   {disabled}
   {onchange}
   {options}
   {testId}
   {tooltip}
/>
