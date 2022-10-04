<script>
   export let label = void 0;
   export let icon = void 0;
</script>

<div class="stat">
   <i class={icon} />
   <div class="label">
      {label}
   </div>
</div>

<style lang="scss">
   @import "../../../styles/mixins.scss";

   .stat {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include label;
      padding: 0.25rem;

      .label {
         font-weight: bold;
         margin-left: 0.25rem;
      }
   }
</style>
