<script>
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';

   /**
    * @typedef {object} MiniIconButtonProps Props for the MiniIconButton component.
    * @property {string | undefined} icon - The icon class to display for this button.
    * @property {boolean} disabled - Whether this button is disabled.
    * @property {string | TooltipAction | undefined} tooltip - The tooltip to display for this element, if any.
    * @property {((event: MouseEvent) => void) | undefined} onclick - Callback invoked when the button is clicked.
    * @property {string} label - Accessible label, forwarded to the inner IconButton.
    * @property {string | undefined} [testId] - Optional stable selector applied as `data-testid` on the wrapper div.
    */

   /** @type {MiniIconButtonProps} */
   const {
      icon = void 0,
      disabled = false,
      tooltip = void 0,
      onclick = void 0,
      label,
      testId = void 0,
   } = $props();
</script>

<div class="button" data-testid={testId}>
   <IconButton
      {disabled}
      {icon}
      {label}
      {onclick}
      {tooltip}
   />
</div>

<style lang="scss">
   .button {
      cursor: pointer;

      --titan-button-line-height: var(--titan-line-height-small);
      --titan-button-font-size: var(--titan-font-size-small);
      --titan-icon-button-radius: 20px;
   }
</style>
