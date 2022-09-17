<script>
   export let label = void 0;
</script>

<div class="tag">
   {label}
</div>

<style lang="scss">
   @import "../../../styles/mixins.scss";

   .tag {
      @include flex-row;
      @include flex-group-center;
      @include border;
      font-weight: bold;
      padding: 0.25rem;
      background: var(--label-background-color);
   }
</style>
