<script>
   export let label = void 0;
   export let attribute = void 0;
</script>

<div class="tag {attribute}">
   {label}
</div>

<style lang="scss">
   @import "../../../styles/mixins.scss";

   .tag {
      @include label;
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include attribute-colors;
      flex-wrap: wrap;
      font-weight: bold;
      padding: 0.25rem;
   }
</style>
