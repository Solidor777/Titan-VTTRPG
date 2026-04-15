<script>
   import LabeledElement from '~/helpers/svelte-components/LabeledElement.svelte';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';

   /** @type {string} The value that this input should modify. */
   export let value = void 0;

   /** @type {string} Label to display. */
   export let label = void 0;

   /** @type {string} Optional Icon to display. */
   export let icon = void 0;

   /** @type {boolean} Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type {string | TooltipAction} The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<LabeledElement
   {icon}
   {label}
   {tooltip}
>
   <TextInput bind:value {disabled}/>
</LabeledElement>
