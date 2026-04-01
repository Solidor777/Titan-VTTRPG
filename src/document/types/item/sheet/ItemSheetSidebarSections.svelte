<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');
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
      @include flex-column;
      @include flex-group-top;

      min-width: 208px;
      width: 208px;
      height: 100%;

      .section {
         &:not(:first-child) {
            @include border-top;

            margin-top: var(--titan-spacing-large);
         }
      }
   }
</style>
