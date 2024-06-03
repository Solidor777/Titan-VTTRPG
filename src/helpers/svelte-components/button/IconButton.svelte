<script>
   import preventDefault from '~/helpers/svelte-actions/PreventDefault.js';
   import tooltipAction from '~/helpers/svelte-actions/Tooltip.js';

   /** @type boolean The icon to display for this button. */
   export let icon = void 0;

   /** @type boolean Whether this input is disabled. */
   export let disabled = false;

   /** @type string Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<button {disabled} on:click on:mousedown={preventDefault} use:tooltipAction={tooltip}>
   <i class={icon}/>
</button>

<style lang="scss">
   button {
      @include icon-button;

      i {
         margin-right: 0;
      }
   }
</style>
