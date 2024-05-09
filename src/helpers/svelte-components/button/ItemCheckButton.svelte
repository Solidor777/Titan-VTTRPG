<script>
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import { DICE_ICON } from '~/system/Icons.js';

   // Check reference
   export let check = void 0;

   export let disabled = void 0;

   function roundCssTransformMatrix(element) {
      let mx = window.getComputedStyle(element, null); //gets the current computed style
      element.style.transform = ''; //resets the redifined matrix to allow recalculation, the original style should be defined in the class not inline.
      mx = mx.getPropertyValue('-webkit-transform') ||
         mx.getPropertyValue('-moz-transform') ||
         mx.getPropertyValue('-ms-transform') ||
         mx.getPropertyValue('-o-transform') ||
         mx.getPropertyValue('transform') || false;
      let values = mx.replace(/ |\(|\)|matrix/g, '').split(',');
      for (let v in values) {
         values[v] = Math.ceil(values[v]);
      }
      ('#' + element).css({ transform: 'matrix(' + values.join() + ')' });
   }
</script>

<div class="item-check-button {check.attribute}">
   <Button on:click {disabled}>
      <div class="button-inner">
         <i class="{DICE_ICON}"/>
         <div>
            {check.label}
         </div>
      </div>
   </Button>
</div>

<style lang="scss">
   .item-check-button {
      @include flex-row;

      &.body {
         --button-background: var(--body-color);
      }

      &.mind {
         --button-background: var(--mind-color);
      }

      &.soul {
         --button-background: var(--soul-color);
      }

      .button-inner {
         @include flex-row;
         @include flex-group-center;
         @include font-size-normal;

         height: 100%;
         line-height: normal;
         padding: var(--padding-standard);

         i {
            margin-right: var(--padding-standard);
         }
      }
   }
</style>
