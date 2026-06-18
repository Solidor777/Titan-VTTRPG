<script>
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import { ATTACK_TYPES } from '~/system/AttackTypes.js';
   import { MELEE_ICON, ACCURACY_ICON } from '~/system/Icons.js';

   /**
    * @typedef {object} AttackTypeSelectProps
    * @property {string} [value] - The value that this input should modify.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this element, if any.
    * @property {() => void} [onchange] - Callback fired when the selected value changes.
    * @property {string} [testId] - Optional stable selector applied as `data-testid` on the root element.
    */

   /** @type {AttackTypeSelectProps} */
   let {
      value = $bindable(void 0),
      disabled = false,
      tooltip = void 0,
      onchange = void 0,
      testId = void 0,
   } = $props();

   /** @type {object} Maps each attack type to its FontAwesome icon class (ranged uses the accuracy icon). */
   const ATTACK_TYPE_ICONS = {
      melee: MELEE_ICON,
      ranged: ACCURACY_ICON,
   };

   /** @type {object[]} Options for the Select component, each carrying its icon. */
   const options = ATTACK_TYPES.map((type) => ({ value: type, icon: ATTACK_TYPE_ICONS[type] }));
</script>

<Select
   bind:value
   {disabled}
   onchange={onchange}
   {options}
   {tooltip}
   testId={testId}
/>
