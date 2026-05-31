<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import Text from '~/helpers/svelte-components/Text.svelte';

   /**
    * @typedef {object} CheckDialogSummaryProps
    * @property {string | TextData} [label] The text label to display for this element.
    * @property {*} [value] The value to display.
    * @property {string | TextData} [tooltip] The tooltip to display when the element is hovered.
    * @property {string} [testId] The stable `data-testid` applied to the value tag.
    */

   /** @type {CheckDialogSummaryProps} */
   const {
      label = undefined,
      value = undefined,
      tooltip = undefined,
      testId = undefined,
   } = $props();

</script>

<!--Field-->
<div class="field" use:tooltipAction={tooltip}>

   <!--Label-->
   <div class="sign">
      <Text text={label}/>
   </div>

   <!--Value-->
   <div class="value">
      <div class="tag" data-testid={testId}>
         {value}
      </div>
   </div>
</div>

<style lang="scss">
   .field {
      @include flex-row;
      @include flex-group-center;
      @include padding-standard;

      width: 100%;

      .sign {
         @include flex-group-right;
         @include border-right;

         width: 100%;
         font-weight: bold;

         @include padding-right-large;
      }

      .value {
         width: 100%;

         .tag {
            @include border;
            @include tag;
            @include margin-left-large;
         }
      }
   }
</style>
