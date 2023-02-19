<script>
   import { localize } from '~/helpers/Utility.js';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';

   // Value to toggle
   export let enabled = void 0;

   // Label to display
   export let label = void 0;

   // Cost of the aspect
   export let cost = void 0;
</script>

<EfxButton on:click>
   <div class="button-content">
      <!--Label-->
      <div class="aspect-label">
         {label}
         <!--Icon-->
         <div class="icon">
            <i class={enabled ? 'fas fa-square-check' : 'fas fa-square'} />
         </div>
      </div>

      <!--Cost-->
      <div class="cost">
         <!--Label-->
         <div class="cost-label">
            {localize('cost')}:
         </div>

         <!--Value-->
         <div class="value">
            {cost}
         </div>
      </div>
   </div>

   <div class="spacer" />
</EfxButton>

<style lang="scss">
   @import '../../../../Styles/Mixins.scss';

   .button-content {
      @include flex-row;
      @include flex-space-between;
      width: 100%;
      margin: 0;

      .aspect-label {
         @include flex-row;
         @include flex-group-left;
         margin-left: 0.5rem;

         .icon {
            @include flex-row;
            @include flex-group-right;
            margin-left: 0.5rem;
         }
      }

      .cost {
         @include flex-row;
         @include flex-group-right;
         font-weight: bold;
         margin-right: 0.5rem;

         .value {
            @include flex-row;
            @include flex-group-center;
            @include static-value;
            @include border;

            height: 1.5rem;
            width: 1.5rem;
            margin-left: 0.25rem;
         }
      }
   }
</style>
