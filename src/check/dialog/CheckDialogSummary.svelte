<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import Text from '~/helpers/svelte-components/Text.svelte';

   /** @type {string|TextData} The text label to display for this element. */
   export let label = void 0;

   /** @type {*} The value to display. */
   export let value = void 0;

   /** @type {string|TextData} The tooltip to display when the element is hovered. */
   export let tooltip = void 0;

</script>

<!--Field-->
<div class="field" use:tooltipAction={tooltip}>

   <!--Label-->
   <div class="sign">
      <Text text={label}/>
   </div>

   <!--Value-->
   <div class="value ">
      <div class="tag">
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
         padding-right: var(--titan-spacing-large);
      }

      .value {
         width: 100%;

         .tag {
            @include border;
            @include tag;

            margin-left: var(--titan-spacing-large);
         }
      }
   }
</style>
