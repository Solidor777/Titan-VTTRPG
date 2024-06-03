<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';

   /** @type number The amount of resolve to spend. */
   export let resolveCost = void 0;

   /** @type boolean Whether the button should be disabled. */
   export let disabled = void 0;
</script>

<div class="spend-resolve-button">
   <Button {disabled} on:click>
      <div class="button-inner">
         <i class="fa fa-bolt"/>
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
         padding: var(--titan-padding-standard);

         i {
            margin-right: var(--titan-padding-standard);
         }
      }
   }
</style>
