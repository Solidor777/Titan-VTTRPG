<script>
   export let max = void 0;
   export let value = void 0;
   export let icon = void 0;
   export let label = void 0;
</script>

<div class="resource">
   <i class={icon} />
   <div class="label">{label}</div>
   <div>
      {`${value} / ${max}`}
   </div>
</div>

<style lang="scss">
   @import '../styles/Mixins.scss';

   .resource {
      @include flex-row;
      @include flex-group-center;
      flex-wrap: wrap;

      .label {
         @include border-right;
         margin-right: 0.5rem;
         padding-right: 0.5rem;
      }

      i {
         margin-right: 0.5rem;
      }
   }
</style>
