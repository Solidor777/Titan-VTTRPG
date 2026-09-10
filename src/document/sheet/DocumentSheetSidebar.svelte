<script>
   import localize from '~/helpers/utility-functions/Localize.js';

   /**
    * @typedef {object} DocumentSheetSidebarSection
    * @property {import('svelte').SvelteComponent} component The Svelte Component that renders the section.
    * @property {string} [label] Localization key for a label rendered above the section.
    */

   /**
    * @typedef {object} DocumentSheetSidebarProps
    * @property {(import('svelte').SvelteComponent | DocumentSheetSidebarSection)[]} [sections] List of sections to
    * render. Each entry is either a bare Svelte Component or a `{ component, label }` object that renders a label
    * above the component.
    */

   /** @type {DocumentSheetSidebarProps} */
   const { sections = undefined } = $props();
</script>

<div class="sidebar">
   {#each sections as entry}
      {@const isDescriptor = Boolean(entry.component)}
      {@const Section = isDescriptor ? entry.component : entry}
      <div class="section">
         {#if isDescriptor && entry.label}
            <div class="section-label">{localize(entry.label)}</div>
         {/if}
         <Section/>
      </div>
   {/each}
</div>

<style lang="scss">
   .sidebar {
      @include panel-1;
      @include flex-column;
      @include flex-group-top;
      @include border-separated-column(var(--titan-sidebar-spacing));

      height: 100%;
      width: var(--titan-sidebar-width);
      min-width: var(--titan-sidebar-width);
      padding: var(--titan-sidebar-padding);

      .section-label {
         @include section-label;
      }
   }
</style>
