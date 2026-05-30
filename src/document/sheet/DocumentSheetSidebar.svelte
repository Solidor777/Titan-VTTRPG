<script>
   /**
    * @typedef {object} DocumentSheetSidebarProps
    * @property {import('svelte').SvelteComponent[]} [sections] List of Svelte Components that make up the sections of
    *    the sidebar.
    */

   /** @type {DocumentSheetSidebarProps} */
   const { sections = undefined } = $props();
</script>

<div class="sidebar">
   {#each sections as Section}
      <div class="section">
         <Section/>
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
