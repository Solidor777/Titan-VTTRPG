<script>
   export let label = void 0;
   export let value = void 0;
   export let icon = void 0;
</script>

<div class="stat">
   <div class="label">
      <i class="fas fa-{icon}" />
      <div class="text">
         {label}
      </div>
   </div>
   <div class="value">
      {value}
   </div>
</div>

<style lang="scss">
   @import "../../styles/mixins.scss";

   .stat {
      @include flex-row;
      @include flex-group-center;
      @include border;
      padding: 0.25rem;
      background: var(--label-background-color);

      .label {
         @include flex-row;
         @include flex-group-center;
         @include border-right;
         font-weight: bold;
         padding-right: 0.25rem;
         margin-right: 0.25rem;

         i {
            margin-right: 0.25rem;
         }
      }
   }
</style>
