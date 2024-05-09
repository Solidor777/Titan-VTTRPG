<script>
   export let label = void 0;
   export let icon = void 0;
</script>

<div class="stat">
   <i class={icon}/>
   <div class="label">
      {label}
   </div>
</div>

<style lang="scss">
   .stat {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include label;
      padding: var(--padding-standard);

      .label {
         font-weight: bold;
         margin-left: var(--padding-standard);
      }
   }
</style>
