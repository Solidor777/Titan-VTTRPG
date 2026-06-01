<script>
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import { SKILLS } from '~/system/Skills.js';

   /**
    * @typedef {object} SkillSelectProps
    * @property {string} [value] - The value that this input should modify.
    * @property {boolean} [allowAll] - Whether to allow All as an option.
    * @property {boolean} [allowNone] - Whether to allow None as an option.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this element, if any.
    * @property {(event: Event) => void} [onchange] - Callback fired when the selected value changes.
    * @property {string} [testId] - Optional stable selector applied as `data-testid` on the root element.
    */

   /** @type {SkillSelectProps} */
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
      const list = structuredClone(SKILLS);
      if (allowAll) {
         list.unshift('all');
      }
      if (allowNone) {
         list.push('none');
      }
      return list;
   });
</script>

<Select
   bind:value
   {disabled}
   onchange={onchange}
   {options}
   {tooltip}
   testId={testId}
/>
