<script>
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import {SPEND_RESOLVE_ICON} from '~/system/Icons.js';

   // Check reference
   export let check = void 0;

   export let disabled = void 0;
</script>

<div class="item-check-button {check.attribute}">
   <Button {disabled} on:click>
      <div class="button-inner">
         <i class="fa fa-dice"/>
         <div>
            {check.label}
         </div>
         <i class="divider ${SPEND_RESOLVE_ICON}"/>
         <div>
            {check.resolveCost}
         </div>
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
         height: 100%;
         line-height: normal;
         padding: var(--padding-standard);

         i {
            margin-right: var(--padding-standard);
         }

         .divider {
            @include border-left;
            border-color: var(--button-border-color);
            margin-left: var(--padding-standard);
            padding-left: var(--padding-standard);
         }
      }
   }
</style>
