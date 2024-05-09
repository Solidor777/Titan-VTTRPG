<script>
   export let label = void 0;
</script>

<div class="tag">
   {label}
</div>

<style lang="scss">
   .tag {
      @include tag;
      @include label;
   }
</style>
