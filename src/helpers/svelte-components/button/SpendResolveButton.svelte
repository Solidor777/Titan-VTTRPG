<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';

   /**
    * @typedef {object} SpendResolveButtonProps
    * @property {number} [resolveCost] - The amount of resolve to spend.
    * @property {boolean} [disabled] - Whether the button should be disabled.
    * @property {((event: MouseEvent) => void) | undefined} [onclick] - Callback fired when the button is clicked.
    */

   /** @type {SpendResolveButtonProps} */
   const {
      resolveCost = void 0,
      disabled = void 0,
      onclick = void 0,
   } = $props();
</script>

<div class="spend-resolve-button">
   <Button {disabled} {onclick}>
      <div class="button-inner">
         <i class="fa fa-bolt"></i>
         <div>
            {localize('spendX%Resolve').replace('X%', resolveCost.toString())}
         </div>
      </div>
   </Button>
</div>

<style lang="scss">
   .spend-resolve-button {
      @include flex-row;

      .button-inner {
         @include flex-row;
         @include flex-group-center;
         @include font-size-normal;

         height: 100%;

         @include padding-standard;

         i {
            @include margin-right-standard;
         }
      }
   }
</style>
