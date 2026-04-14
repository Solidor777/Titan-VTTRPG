<script>
   import preventDefault from '~/helpers/svelte-actions/PreventDefault.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type {string} The Attribute that this component represents. */
   export let attribute;

   /** @type {boolean} Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type {string|TooltipAction} The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<button class={attribute} {disabled} on:click on:mousedown={preventDefault} use:tooltipAction={tooltip}>
   <slot/>
</button>

<style lang="scss">
   button {
      @include button;
      @include attribute-button;
   }
</style>

