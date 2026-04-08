<script>
   import MiniButton from '~/helpers/svelte-components/button/MiniButton.svelte';

   /** @type {boolean} - Whether this Option is currently enabled. */
   export let enabled = void 0;

   /** @type {boolean} - The label to display for the option. */
   export let label = void 0;

   /** @type {boolean} - Whether the button should currently be disabled. */
   export let disabled = false;

   /** @type {string|TooltipAction} - The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<div class="toggle {enabled ? 'enabled' : 'disabled'}">
   <MiniButton {disabled} on:click {tooltip}>
      {label}
   </MiniButton>
</div>

<style lang="scss">
   .enabled {
      --titan-button-background: var(--titan-highlighted-background);
   }
</style>
