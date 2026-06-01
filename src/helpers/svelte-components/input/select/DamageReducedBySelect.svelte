<script>
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';

   /**
    * @typedef {object} DamageReducedBySelectProps
    * @property {string} [value] - The value that this input should modify.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {boolean} [allowResistanceCheck] - Whether to allow Resistance Check as an option.
    * @property {boolean} [allowOpposedCheck] - Whether to allow Opposed Check as an option.
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this element, if any.
    * @property {(event: Event) => void} [onchange] - Callback fired when the selected value changes.
    * @property {string} [testId] - Optional stable selector applied as `data-testid` on the root element.
    */

   /** @type {DamageReducedBySelectProps} */
   let {
      value = $bindable(void 0),
      disabled = false,
      allowResistanceCheck = void 0,
      allowOpposedCheck = void 0,
      tooltip = void 0,
      onchange = void 0,
      testId = void 0,
   } = $props();

   /**
    * @type {string[]} Options for the Select Svelte component, derived to include conditional check
    * options when allowed.
    */
   const options = $derived.by(() => {
      const list = ['none'];

      // Add Resistance Check if appropriate.
      if (allowResistanceCheck) {
         list.push('resistanceCheck');
      }

      // Add Opposed Check if appropriate.
      if (allowOpposedCheck) {
         list.push('opposedCheck');
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
