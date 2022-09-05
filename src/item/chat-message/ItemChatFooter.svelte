<div class="footer">
   <slot />
</div>

<style lang="scss">
   @import "../../styles/mixins.scss";

   .footer {
      @include flex-row;
      @include flex-space-evenly;
      width: 100%;
      padding: 0.5rem;
      font-size: 0.9rem;
   }
</style>
