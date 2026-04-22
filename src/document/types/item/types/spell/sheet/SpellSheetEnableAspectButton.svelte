<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import { CHECKED_ICON, UNCHECKED_ICON } from '~/system/Icons.js';

   // Value to toggle.
   /** @type {boolean} */
   export let enabled = void 0;

   // Label to display.
   /** @type {string} */
   export let label = void 0;

   // Cost of the aspect.
   /** @type {number} */
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
         @include margin-left-large;

         .icon {
            @include flex-row;
            @include flex-group-right;
            @include margin-left-large;
         }
      }

      .cost {
         @include flex-row;
         @include flex-group-right;

         font-weight: bold;

         @include margin-right-large;

         .value {
            @include flex-row;
            @include flex-group-center;
            @include border;
            @include calculated-value;

            height: 24px;
            width: 24px;

            @include margin-left-standard;
         }
      }
   }
</style>
