<script>
   export let label = void 0;
   export let attribute = void 0;
</script>

<div class="tag {attribute}">
   {label}
</div>

<style lang="scss">
   .tag {
      @include tag;

      &.body {
         --titan-tag-background: var(--titan-body-color);
      }

      &.mind {
         --titan-tag-background: var(--titan-mind-color);
      }

      &.soul {
         --titan-tag-background: var(--titan-soul-color);
      }
   }
</style>
