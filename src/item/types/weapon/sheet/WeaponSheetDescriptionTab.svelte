<script>
   import { getContext } from 'svelte';
   import { localize } from '~/helpers/Utility.js';
   import Tabs from '~/helpers/svelte-components/Tabs.svelte';
   import WeaponSheetAttackNotesTab from './WeaponSheetAttackNotesTab.svelte';
   import WeaponSheetItemDescriptionTab from './WeaponSheetItemDescriptionTab.svelte';

   // Setup context variables
   const appState = getContext('ApplicationStateStore');

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
   <Tabs {tabs} bind:activeTab={$appState.activeDescriptionTab} />
</div>

<style lang="scss">
   @import '../../../../Styles/Mixins.scss';
   .tab {
      @include flex-row;
      @include flex-group-center;
      height: 100%;
      width: 100%;
   }
</style>
