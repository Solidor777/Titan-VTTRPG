<script>
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import { DICE_ICON, SPEND_RESOLVE_ICON } from '~/system/Icons.js';

   /**
    * @typedef {object} ItemCheckButtonProps
    * @property {string} [label] - The Label for the check.
    * @property {string} [attribute] - The Attribute to use for the check.
    * @property {number} [resolveCost] - The Resolve cost of rolling the check, if any.
    * @property {boolean} [disabled] - Whether the button should be disabled.
    * @property {((event: MouseEvent) => void) | undefined} [onclick] - Callback fired when the button is clicked.
    */

   /** @type {ItemCheckButtonProps} */
   const {
      label = void 0,
      attribute = void 0,
      resolveCost = void 0,
      disabled = void 0,
      onclick = void 0,
   } = $props();
</script>

<div class="item-check-button {attribute}">
   <Button {disabled} {onclick}>
      <div class="button-inner">
         <i class={DICE_ICON}/>
         <div>
            {label}
         </div>

         {#if resolveCost}
            <div class="resolve">
               <i class={SPEND_RESOLVE_ICON}/>
               <div>
                  {resolveCost}
               </div>
            </div>
         {/if}
      </div>
   </Button>
</div>

<style lang="scss">
   .item-check-button {
      @include flex-row;
      @include attribute-button;

      .button-inner {
         @include flex-row;
         @include flex-group-center;
         @include font-size-normal;

         i {
            @include margin-right-standard;
         }

         .resolve {
            @include border-left;
            @include flex-row;
            @include flex-group-center;

            border-color: var(--titan-button-border-color);

            @include margin-left-standard;
            @include padding-left-standard;
         }
      }
   }
</style>
