<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import ItemSheetSidebarChecks from '~/item/component/check/ItemSheetSidebarChecks.svelte';
   import ItemSheetSidebarTraits from '../../../sheet/ItemSheetSidebarTraits.svelte';
   import SpellSheetSidebarCastingCheck from './SpellSheetSidebarCastingCheck.svelte';

   // Application statee reference
   const appState = getContext('ApplicationStateStore');
   const document = getContext('DocumentStore');
</script>

<div class="sidebar">
   <ScrollingContainer bind:scrollTop={$appState.scrollTop.sidebar}>
      <!--Traits-->
      <div class="section">
         <ItemSheetSidebarTraits />
      </div>

      <!--Casting Check-->
      <div class="section">
         <SpellSheetSidebarCastingCheck />
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
      padding-bottom: 0.25rem;

      .section {
         @include flex-column;
         @include flex-group-top;

         &:not(:first-child) {
            margin-top: 0.5rem;
         }

         &:not(:first-child) {
            @include border-top;
         }
      }
   }
</style>
