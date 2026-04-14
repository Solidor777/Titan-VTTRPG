<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');

   /** @type {SvelteComponent}[] List of Svelte Components that make up the sections of the sidebar. */
   export let sections = void 0;
</script>

<div class="sidebar">
   <ScrollingContainer bind:scrollTop={$appState.sidebar.scrollTop}>
      {#each sections as section}
         <div class="section" transition:slide|local>
            <svelte:component this={section}/>
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
