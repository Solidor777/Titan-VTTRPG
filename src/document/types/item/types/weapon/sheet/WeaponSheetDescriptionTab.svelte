<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import Tabs from '~/helpers/svelte-components/Tabs.svelte';
   import WeaponSheetAttackNotesTab from '~/document/types/item/types/weapon/sheet/WeaponSheetAttackNotesTab.svelte';
   import WeaponSheetItemDescriptionTab
      from '~/document/types/item/types/weapon/sheet/WeaponSheetItemDescriptionTab.svelte';

   /** @type object Reference to the Application State store. */
   const appState = getContext('applicationState');

   // Tabs
   const tabs = [
      {
         label: localize('itemDescription'),
         id: 'itemDescription',
         component: WeaponSheetItemDescriptionTab,
      },
      {
         label: localize('attackNotes'),
         id: 'attackNotes',
         component: WeaponSheetAttackNotesTab,
      },
   ];
</script>

<div class="tab">
   <Tabs bind:activeTab={$appState.activeDescriptionTab} {tabs}/>
</div>

<style lang="scss">
   .tab {
      @include flex-column;

      width: 100%;
      flex-grow: 1;
   }
</style>
