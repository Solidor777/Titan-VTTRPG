<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';

   /**
    * @typedef {object} DocumentSheetScrollingSidebarProps
    * @property {object[] | undefined} [sections] List of Svelte Components that make up the sections of the sidebar.
    */

   /** @type {DocumentSheetScrollingSidebarProps} */
   const { sections = undefined } = $props();

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');
</script>

<div class="sidebar">
   <ScrollingContainer bind:scrollTop={$appState.sidebar.scrollTop}>
      {#each sections as Section}
         <div class="section" transition:slide|local>
            <Section/>
         </div>
      {/each}
   </ScrollingContainer>
</div>

<style lang="scss">
   .sidebar {
      @include border;
      @include panel-1;
      @include flex-column;
      @include flex-group-top;

      .section {
         @include border-separated-column-child(var(--titan-sidebar-spacing));
      }

      height: 100%;
      width: var(--titan-sidebar-width);
      min-width: var(--titan-sidebar-width);
      padding: 0;
   }
</style>
