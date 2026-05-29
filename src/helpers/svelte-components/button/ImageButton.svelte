<script>
   import preventDefault from '~/helpers/svelte-actions/PreventDefault.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @typedef {object} ImageButtonProps
    * @property {string} [src] - Image source.
    * @property {string} [alt] - Text to display if the value is not a path to valid image.
    * @property {boolean} [disabled] - Whether the button should currently be disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    * @property {((event: MouseEvent) => void) | undefined} [onclick] - Callback fired when the button is clicked.
    */

   /** @type {ImageButtonProps} */
   const {
      src = 'img',
      alt = 'img',
      disabled = false,
      tooltip = void 0,
      onclick = void 0,
   } = $props();
</script>

<button
   {disabled}
   {onclick}
   onmousedown={preventDefault}
   use:tooltipAction={tooltip}
>
   <img {alt} {src}/>
</button>

<style lang="scss">
   button {
      @include image-button
   }
</style>
