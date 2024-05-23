<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import { CHECKED_ICON, UNCHECKED_ICON } from '~/system/Icons.js';

   // Value to toggle
   export let enabled = void 0;

   // Label to display
   export let label = void 0;

   // Cost of the aspect
   export let cost = void 0;
</script>

<Button on:click>
   <div class="button-content">
      <!--Label-->
      <div class="aspect-label">
         {label}
         <!--Icon-->
         <div class="icon">
            <i class={enabled ? CHECKED_ICON : UNCHECKED_ICON}/>
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

   <div class="spacer"/>
</Button>

<style lang="scss">
   .button-content {
      @include flex-row;
      @include flex-space-between;

      width: 100%;
      margin: 0;

      .aspect-label {
         @include flex-row;
         @include flex-group-left;

         margin-left: var(--padding-large);

         .icon {
            @include flex-row;
            @include flex-group-right;

            margin-left: var(--padding-large);
         }
      }

      .cost {
         @include flex-row;
         @include flex-group-right;

         font-weight: bold;
         margin-right: var(--padding-large);

         .value {
            @include flex-row;
            @include flex-group-center;
            @include static-value;
            @include border;

            height: 24px;
            width: 24px;
            margin-left: var(--padding-standard);
         }
      }
   }
</style>
