<script>
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';

   /** @type {string} The icon class to display for this button. */
   export let icon = void 0;

   /** @type {boolean} Whether this input is disabled. */
   export let disabled = false;

   /**
    * @type {string | TooltipAction}
    * The Tooltip to display for this element, if any.
    */
   export let tooltip = void 0;
</script>

<div class="button">
   <IconButton {disabled} {icon} on:click {tooltip}/>
</div>

<style lang="scss">
   .button {
      cursor: pointer;

      --titan-button-line-height: var(--titan-line-height-small);
      --titan-button-font-size: var(--titan-font-size-small);
      --titan-icon-button-radius: 20px;
   }
</style>
