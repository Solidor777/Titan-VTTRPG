<script>
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import IconLabel from '~/helpers/svelte-components/label/IconLabel.svelte';

   /**
    * @typedef {object} IconLabelButtonProps
    * @property {string} [label] - The text label to display for this element.
    * @property {string} [icon] - The Icon to display for this element.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    * @property {((event: MouseEvent) => void) | undefined} [onclick] - Callback fired when the button is clicked.
    * @property {string | undefined} [testId] - Optional stable selector applied as `data-testid` on the inner button.
    */

   /** @type {IconLabelButtonProps} */
   const {
      label = void 0,
      icon = void 0,
      disabled = false,
      tooltip = void 0,
      onclick = void 0,
      testId = void 0,
   } = $props();
</script>

<Button
   {disabled}
   {onclick}
   {testId}
   {tooltip}
>
   <IconLabel
      {icon}
      {label}
   />
</Button>
