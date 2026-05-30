<script>
   import localize from '~/helpers/utility-functions/Localize.js';

   /**
    * @typedef {object} CharacterSheetItemTraditionProps
    * @property {TitanItem} [item] Reference to the item.
    */

   /** @type {CharacterSheetItemTraditionProps} */
   const { item = undefined } = $props();
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
      @include padding-standard;

      background: var(--titan-tag-background);

      .label {
         @include margin-right-standard;
      }
   }
</style>
