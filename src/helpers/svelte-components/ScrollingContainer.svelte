<div class="container">
   <div class="content">
      <slot>Scrolling Content</slot>
   </div>
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   .container {
      @include flex-column;
      position: relative;
      width: 100%;
      height: 100%;

      .content {
         @include flex-column;
         width: 100%;
         position: absolute;
         top: 0;
         left: 0;
         bottom: 0;
         overflow-y: scroll;
         padding: 0.25rem;
      }
   }
</style>
