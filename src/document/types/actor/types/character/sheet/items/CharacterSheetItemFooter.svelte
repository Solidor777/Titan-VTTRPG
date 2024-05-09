<!--Footer-->
<div class="item-footer">
   <slot />
</div>

<style lang="scss">
   .item-footer {
      @include flex-row;
      @include flex-space-evenly;
      flex-wrap: wrap;
      @include font-size-small;
      font-weight: bold;
      width: 100%;
   }
</style>
