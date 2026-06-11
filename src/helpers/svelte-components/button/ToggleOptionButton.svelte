<script>
   import MiniButton from '~/helpers/svelte-components/button/MiniButton.svelte';

   /**
    * @typedef {object} ToggleOptionButtonProps
    * @property {boolean} [enabled] - Whether this Option is currently enabled.
    * @property {string} [label] - The label to display for the option.
    * @property {boolean} [disabled] - Whether the button should currently be disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    * @property {((event: MouseEvent) => void) | undefined} [onclick] - Callback fired when the button is clicked.
    * @property {string | undefined} [testId] - Optional stable selector applied as `data-testid` on the wrapper div.
    */

   /** @type {ToggleOptionButtonProps} */
   const {
      enabled = void 0,
      label = void 0,
      disabled = false,
      tooltip = void 0,
      onclick = void 0,
      testId = void 0,
   } = $props();
</script>

<div class="toggle {enabled ? 'enabled' : 'not-enabled'}" data-testid={testId}>
   <MiniButton
      {disabled}
      {onclick}
      {tooltip}
   >
      {label}
   </MiniButton>
</div>

<style lang="scss">
   .enabled {
      --titan-button-background: var(--titan-highlighted-background);
      --titan-button-font-color: var(--titan-highlighted-font-color);
   }
</style>
