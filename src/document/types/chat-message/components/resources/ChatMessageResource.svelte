<script>
   export let max = void 0;
   export let value = void 0;
   export let icon = void 0;
   export let label = void 0;
</script>

<div class="resource">
   <i class={icon}/>
   <div class="label">{label}</div>
   <div>
      {`${value} / ${max}`}
   </div>
</div>

<style lang="scss">
   .resource {
      @include flex-row;
      @include flex-group-center;

      flex-wrap: wrap;

      .label {
         @include border-right;

         margin-right: var(--padding-large);
         padding-right: var(--padding-large);
      }

      i {
         margin-right: var(--padding-large);
      }
   }
</style>
