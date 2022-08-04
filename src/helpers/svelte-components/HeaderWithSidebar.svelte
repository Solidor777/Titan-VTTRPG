<script>
   import ScrollingContainer from "./ScrollingContainer.svelte";
</script>

<div class="header-with-scrolling-sidebar">
   <div class="sidebar">
      <slot name="sidebar">Sidebar</slot>
   </div>
   <div class="main">
      <div class="header">
         <slot name="header">Header</slot>
      </div>
      <div class="content">
         <slot name="content">Content</slot>
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   .header-with-scrolling-sidebar {
      @include flex-row;
      width: 100%;
      height: 100%;

      .sidebar {
         @include flex-column;
         height: 100%;
         width: var(--sidebar-width);
         min-width: var(--sidebar-width);
      }

      .main {
         @include flex-column;
         width: 100%;
         height: 100%;

         .header {
            @include flex-column;
            width: 100%;
            height: var(--header-height);
         }

         .content {
            @include flex-column;
            width: 100%;
            height: 100%;
         }
      }
   }
</style>
