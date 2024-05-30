<script>
   export let resistance = void 0;
   export let label = void 0;
</script>

<div class="tag {resistance}">
   {label}
</div>

<style lang="scss">
   .tag {
      @include label;
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include resistance-colors;
      @include label;

      padding: var(--titan-padding-standard);
      font-weight: bold;
   }
</style>
