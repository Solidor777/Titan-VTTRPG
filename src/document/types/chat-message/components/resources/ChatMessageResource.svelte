<script>
   /** @type {number} The maximum value of the resource. */
   export let max = void 0;

   /** @type {number} The current value of the resource. */
   export let value = void 0;

   /** @type {string} The icon class to display for this resource. */
   export let icon = void 0;

   /** @type {string} The localized label to display for this resource. */
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
