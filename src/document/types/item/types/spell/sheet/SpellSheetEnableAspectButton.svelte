<script>
   import Text from '~/helpers/svelte-components/Text.svelte';
   import DocumentOwnerButton from '~/document/svelte-components/DocumentOwnerButton.svelte';
   import { CHECKED_ICON, UNCHECKED_ICON } from '~/system/Icons.js';

   /**
    * @typedef {object} SpellSheetEnableAspectButtonProps
    * @property {boolean} [enabled] Value to toggle.
    * @property {string} [label] Label to display.
    * @property {number} [cost] Cost of the aspect.
    * @property {Function | undefined} [onclick] Callback invoked when the button is clicked.
    */

   /** @type {SpellSheetEnableAspectButtonProps} */
   const { enabled = undefined, label = undefined, cost = undefined, onclick = undefined } = $props();
</script>

<DocumentOwnerButton {onclick}>
   <div class="button-content">
      <!--Label-->
      <div class="aspect-label">
         {label}
         <!--Icon-->
         <div class="icon">
            <i class={enabled ? CHECKED_ICON : UNCHECKED_ICON}></i>
         </div>
      </div>

      <!--Cost-->
      <div class="cost">
         <!--Label-->
         <div class="cost-label">
            <Text text="cost"/>:
         </div>

         <!--Value-->
         <div class="value">
            {cost}
         </div>
      </div>
   </div>

   <div class="spacer"></div>
</DocumentOwnerButton>

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
