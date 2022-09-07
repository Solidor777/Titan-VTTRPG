<svelte:options accessors={true} />

<script>
</script>

<div class="sidebar">Sidebar</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .sidebar {
      @include flex-column;
      @include flex-group-top;
      @include border;
      width: 100%;
      padding: 0.5rem;
      box-sizing: border-box;
   }
</style>
