<script>
   import preventDefault from '~/helpers/svelte-actions/PreventDefault.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type {string} Image source. */
   export let src = 'img';

   /**
    * @type {string} Text to display if the value is not a path to valid image.
    */
   export let alt = 'img';

   /** @type {boolean} Whether the button should currently be disabled. */
   export let disabled = false;

   /**
    * @type {string | TooltipAction}
    * The Tooltip to display for this element, if any.
    */
   export let tooltip = void 0;
</script>

<button
   {disabled}
   on:click
   on:mousedown={preventDefault}
   use:tooltipAction={tooltip}
>
   <img {alt} {src}/>
</button>

<style lang="scss">
   button {
      @include image-button
   }
</style>
