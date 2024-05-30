<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';

   // Check reference
   export let cost = void 0;

   export let disabled = void 0;
</script>

<div class="item-check-button">
   <Button {disabled} on:click>
      <div class="button-inner">
         <i class="fa fa-bolt"/>
         <div>
            {localize('spendX%Resolve').replace('X%', cost)}
         </div>
      </div>
   </Button>
</div>

<style lang="scss">
   .item-check-button {
      @include flex-row;

      .button-inner {
         @include flex-row;
         @include flex-group-center;
         @include font-size-normal;

         height: 100%;
         line-height: normal;
         padding: var(--titan-padding-standard);

         i {
            margin-right: var(--titan-padding-standard);
         }
      }
   }
</style>
