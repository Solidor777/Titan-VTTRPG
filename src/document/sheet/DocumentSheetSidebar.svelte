<script>
   /**
    * @type {SvelteComponent[]}
    * List of Svelte Components that make up the sections of the sidebar.
    */
   export let sections = void 0;
</script>

<div class="sidebar">
   {#each sections as section}
      <div class="section">
         <svelte:component this={section}/>
      </div>
   {/each}
</div>

<style lang="scss">
   .sidebar {
      @include border;
      @include panel-1;
      @include flex-column;
      @include flex-group-top;
      @include border-separated-column(var(--titan-sidebar-spacing));

      height: 100%;
      width: var(--titan-sidebar-width);
      min-width: var(--titan-sidebar-width);
      padding: var(--titan-sidebar-padding);
   }
</style>
