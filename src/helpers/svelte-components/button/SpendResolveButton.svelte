<script>
   import { localize } from '~/helpers/Utility.js';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';

   // Check reference
   export let cost = void 0;

   export let disabled = void 0;
</script>

<div class="item-check-button">
   <EfxButton on:click {disabled}>
      <div class="button-inner">
         <i class="fa fa-bolt" />
         <div>
            {localize('spend%xResolve').replace('%x', cost)}
         </div>
      </div>
   </EfxButton>
</div>

<style lang="scss">
   @import '../../../Styles/Mixins.scss';

   .item-check-button {
      @include flex-row;

      .button-inner {
         @include flex-row;
         @include flex-group-center;
         @include font-size-normal;
         height: 100%;
         line-height: normal;
         padding: 0.25rem;

         i {
            margin-right: 0.25rem;
         }
      }
   }
</style>
