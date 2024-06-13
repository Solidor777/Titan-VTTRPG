<script>
   import {getContext} from 'svelte';
   import {slide} from 'svelte/transition';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import ItemSheetSidebarChecks from '~/document/types/item/sheet/check/ItemSheetSidebarChecks.svelte';
   import ItemSheetSidebarTraits from '~/document/types/item/sheet/ItemSheetSidebarTraits.svelte';
   import WeaponSheetSidebarAttacks from '~/document/types/item/types/weapon/sheet/WeaponSheetSidebarAttacks.svelte';

   /** @type object Reference to the Document store. */
   const appState = getContext('applicationState');

   /** @type object Reference to the Application State store. */
   const document = getContext('document');
</script>

<div class="sidebar">
   <!--Attacks-->
   <ScrollingContainer bind:scrollTop={$appState.scrollTop.sidebar}>
      <!--Custom Traits-->
      <div class="section">
         <ItemSheetSidebarTraits/>
      </div>

      <!--Attacks-->
      <div class="section">
         <WeaponSheetSidebarAttacks/>
      </div>

      <!--Checks-->
      {#if $document.system.check.length > 0}
         <div class="section" transition:slide|local>
            <ItemSheetSidebarChecks/>
         </div>
      {/if}
   </ScrollingContainer>
</div>

<style lang="scss">
   .sidebar {
      @include flex-column;
      @include flex-group-top;
      @include border;
      @include panel-2;

      width: 100%;
      height: 100%;
      min-width: 208px;

      .section {
         @include flex-column;
         @include flex-group-top;

         &:not(:first-child) {
            @include border-top;

            margin-top: var(--titan-padding-large);
         }
      }
   }
</style>
