<script>
   /** @type {number} */
   export let max = void 0;
   /** @type {number} */
   export let value = void 0;
   /** @type {string} */
   export let icon = void 0;
   /** @type {string} */
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

         margin-right: var(--titan-spacing-large);
         padding-right: var(--titan-spacing-large);
      }

      i {
         margin-right: var(--titan-spacing-large);
      }
   }
</style>
