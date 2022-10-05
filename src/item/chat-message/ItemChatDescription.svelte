<script>
   export let description = void 0;
</script>

<div class="description">{description}</div>

<style lang="scss">
   @import "../../styles/mixins.scss";
   .description {
      @include flex-row;
      @include flex-group-left;
      @include font-size-normal;
      width: 100%;
   }
</style>
