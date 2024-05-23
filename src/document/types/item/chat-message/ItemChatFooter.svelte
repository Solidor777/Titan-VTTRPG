<div class="footer">
   <slot />
</div>

<style lang="scss">
   .footer {
      @include flex-row;
      @include flex-space-evenly;

      flex-wrap: wrap;
      width: 100%;
      padding: 0 var(--padding-large) 0 var(--padding-large);

      @include font-size-small;
   }
</style>
