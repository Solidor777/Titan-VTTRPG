<script>
   import localize from '~/helpers/utility-functions/Localize.js';

   // Reference to the item
   export let item = void 0;
</script>

<!--Tradition-->
<div class="tradition">
   <!--Label-->
   <div class="label">
      {localize('tradition')}:
   </div>

   <!--Value-->
   <div class="value">
      {item.system.tradition}
   </div>
</div>

<style lang="scss">
   .tradition {
      @include flex-row;
      @include flex-group-center;
      @include border;

      padding: var(--padding-standard);
      background: var(--label-background);

      .label {
         margin-right: var(--padding-standard);
      }
   }
</style>
