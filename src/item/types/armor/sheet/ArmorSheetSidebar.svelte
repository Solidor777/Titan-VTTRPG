<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import ItemSheetSidebarChecks from '~/item/component/check/ItemSheetSidebarChecks.svelte';
   import ArmorSheetSidebarTraits from './ArmorSheetSidebarTraits.svelte';

   // Application statee reference
   const appState = getContext('ApplicationStateStore');
   const document = getContext('DocumentStore');
</script>

<div class="sidebar">
   <!--Attacks-->
   <ScrollingContainer bind:scrollTop={$appState.scrollTop.sidebar}>
      <!--Traits-->
      <div class="section" transition:slide|local>
         <ArmorSheetSidebarTraits />
      </div>

      <!--Checks-->
      {#if $document.system.check.length > 0}
         <div class="section" transition:slide|local>
            <ItemSheetSidebarChecks />
         </div>
      {/if}
   </ScrollingContainer>
</div>

<style lang="scss">
   @import '../../../../Styles/Mixins.scss';

   .sidebar {
      @include flex-column;
      @include flex-group-top;
      @include border;
      @include panel-2;
      width: 100%;
      height: 100%;

      .section {
         &:not(:first-child) {
            @include border-top;
            margin-top: 0.5rem;
         }
      }
   }
</style>
