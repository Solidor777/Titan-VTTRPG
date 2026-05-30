<script>
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import { CHECKED_ICON, UNCHECKED_ICON } from '~/system/Icons.js';

   /**
    * @typedef {object} ToggleButtonProps
    * @property {string} [label] - The label to display for the option.
    * @property {boolean} [disabled] - Whether the button should currently be disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    * @property {boolean} [active] - Whether the toggle is currently active.
    * @property {((event: MouseEvent) => void) | undefined} [onclick] - Callback fired when the button is clicked.
    */

   /** @type {ToggleButtonProps} */
   const {
      label = void 0,
      disabled = false,
      tooltip = void 0,
      active = void 0,
      onclick = void 0,
   } = $props();
</script>

<Button {disabled} {onclick} {tooltip}>
   <div class="button-inner">
      <div class="label">
         {label}
      </div>
      <i class={active ? CHECKED_ICON : UNCHECKED_ICON}></i>
   </div>
</Button>

<style lang="scss">
   .button-inner {
      @include flex-row;
      @include flex-group-center;

      height: 100%;

      :not(:first-child) {
         @include margin-left-standard;
      }
   }
</style>
