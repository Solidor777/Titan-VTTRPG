<div class="settings">
   <slot />
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";

   .settings {
      @include flex-row;
      @include flex-space-evenly;
      width: 100%;
      font-weight: bold;
   }
</style>
