<script>
   export let label = void 0;
   export let value = void 0;
   export let icon = void 0;
</script>

<div class="stat">
   <i class={icon}/>
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
      @include label;
      padding: var(--padding-standard);

      .label {
         @include border-right;
         font-weight: bold;
         padding-right: var(--padding-standard);
         margin: 0 var(--padding-standard);
      }
   }
</style>
