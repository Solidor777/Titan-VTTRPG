<script>
   // Reference to the item description
   export let description = void 0;
</script>

<div class="description">{@html description}</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";

   .description {
      overflow: hidden;
   }
</style>
