<script>
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import {CHECKED_ICON, UNCHECKED_ICON} from '~/system/Icons.js';

   /** @type boolean The label to display for the option. */
   export let label = void 0;

   /** @type boolean Whether the button should currently be disabled. */
   export let disabled = false;

   /** @type string The Tooltip to display for this element, if any. */
   export let tooltip = void 0;

   /** @type string Whether the toggle is currently active. */
   export let active = void 0;
</script>

<Button {disabled} on:click {tooltip}>
   <div class="button-inner">
      <div class="label">
         {label}
      </div>
      <i class={active ? CHECKED_ICON: UNCHECKED_ICON}/>
   </div>
</Button>

<style lang="scss">
   .button-inner {
      @include flex-row;
      @include flex-group-center;

      height: 100%;

      :not(:first-child) {
         margin-left: var(--titan-padding-standard);
      }
   }
</style>
