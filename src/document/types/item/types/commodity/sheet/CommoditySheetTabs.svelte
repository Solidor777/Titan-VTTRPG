<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ItemSheetChecksTab from '~/document/types/item/component/check/ItemSheetChecksTab.svelte';
   import ItemSheetDescriptionTab from '~/document/types/item/sheet/ItemSheetDescriptionTab.svelte';
   import Tabs from '~/helpers/svelte-components/Tabs.svelte';

   const appState = getContext('applicationState');

   // Tabs
   const tabs = [
      {
         label: localize('description'),
         id: 'description',
         component: ItemSheetDescriptionTab,
      },
      {
         label: localize('checks'),
         id: 'checks',
         component: ItemSheetChecksTab,
      },
   ];
</script>

<Tabs bind:activeTab={$appState.activeTab} border={true} {tabs}/>
