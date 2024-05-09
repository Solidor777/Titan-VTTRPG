<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';

   // Application statee reference
   const appState = getContext('applicationState');
   export let sections = void 0;
</script>

<div class="sidebar">
   <ScrollingContainer bind:scrollTop={$appState.scrollTop.sidebar}>
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
      @include panel-2;
      min-width: 208px;
      width: 100%;
      height: 100%;

      .section {
         &:not(:first-child) {
            @include border-top;
            margin-top: var(--padding-large);
         }
      }
   }
</style>
