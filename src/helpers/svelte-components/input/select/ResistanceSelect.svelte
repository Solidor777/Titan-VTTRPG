<script>
   import { RESISTANCES } from '~/system/Resistances.js';
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import ResistanceInput from '~/helpers/svelte-components/input/ResistanceInput.svelte';

   /**
    * @typedef {object} ResistanceSelectProps
    * @property {string} [value] - The value that this input should modify.
    * @property {boolean} [allowAll] - Whether to allow All as an option.
    * @property {boolean} [allowNone] - Whether to allow None as an option.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this element, if any.
    * @property {(event: Event) => void} [onchange] - Callback fired when the selected value changes.
    * @property {string} [testId] - Optional stable selector applied as `data-testid` on the root element.
    */

   /** @type {ResistanceSelectProps} */
   let {
      value = $bindable(void 0),
      allowAll = false,
      allowNone = false,
      disabled = false,
      tooltip = void 0,
      onchange = void 0,
      testId = void 0,
   } = $props();

   /** @type {string[]} Options for the Select Svelte component, derived to include All / None when allowed. */
   const options = $derived.by(() => {
      const list = structuredClone(RESISTANCES);
      if (allowAll) {
         list.unshift('all');
      }
      if (allowNone) {
         list.push('none');
      }
      return list;
   });
</script>

<ResistanceInput
   resistance={value}
   testId={testId}
>
   <Select
      bind:value
      {disabled}
      onchange={onchange}
      {options}
      {tooltip}
   />
</ResistanceInput>
