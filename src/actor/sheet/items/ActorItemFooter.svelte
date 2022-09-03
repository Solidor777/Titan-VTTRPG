<!--Footer-->
<div class="item-footer">
   <slot />
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .item-footer {
      @include flex-row;
      @include flex-space-evenly;
      flex-wrap: wrap;
      font-size: 0.9rem;
      font-weight: bold;
      width: 100%;
   }
</style>
