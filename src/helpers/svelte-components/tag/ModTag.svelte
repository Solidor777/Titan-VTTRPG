<script>
   export let baseValue = void 0;
   export let currentValue = void 0;
</script>

<!--Total Value-->
<div class="tag {baseValue == currentValue ? '' : currentValue > baseValue ? 'greater' : 'lesser'}">
   {currentValue}
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .tag {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include label;
      @include mod-colors;
      width: 100%;
      height: 100%;
   }
</style>
