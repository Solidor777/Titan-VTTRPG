<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';

   /**
    * @typedef {object} ItemSheetSidebarSectionsProps
    * @property {object[]} [sections] The list of section components to render in the sidebar.
    */

   /** @type {ItemSheetSidebarSectionsProps} */
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
      @include flex-column;
      @include flex-group-top;

      min-width: 208px;
      width: 208px;
      height: 100%;

      .section {
         &:not(:first-child) {
            @include border-top;
            @include margin-top-large;
         }
      }
   }
</style>
