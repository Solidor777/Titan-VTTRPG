<script>
   export let label = void 0;
   export let value = void 0;
</script>

<div class="stat">
   <div class="label">
      {label}
   </div>
   <div class="value">
      {value}
   </div>
</div>

<style lang="scss">
   .stat {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include tag;

      padding: var(--titan-padding-standard);

      .label {
         @include border-right;

         font-weight: bold;
         padding-right: var(--titan-padding-standard);
         margin-right: var(--titan-padding-standard);
      }
   }
</style>
