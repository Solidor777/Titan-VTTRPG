<script>
   import LabeledElement from '~/helpers/svelte-components/LabeledElement.svelte';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';

   /**
    * @typedef {object} LabeledTextInputProps
    * @property {string} [value=undefined] - The value that this input should modify.
    * @property {string} [label=undefined] - Label to display.
    * @property {string} [icon=undefined] - Optional Icon to display.
    * @property {boolean} [disabled=false] - Whether the input should currently be disabled.
    * @property {string|object} [tooltip=undefined] - The Tooltip to display for this element, if any.
    */

   /** @type {LabeledTextInputProps} */
   let {
      value    = $bindable(undefined),
      label    = undefined,
      icon     = undefined,
      disabled = false,
      tooltip  = undefined,
   } = $props();
</script>

<LabeledElement
   {icon}
   {label}
   {tooltip}
>
   <TextInput bind:value {disabled}/>
</LabeledElement>
