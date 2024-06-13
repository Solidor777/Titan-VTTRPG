<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ItemSheetChecksTab from '~/document/types/item/sheet/check/ItemSheetChecksTab.svelte';
   import ItemSheetDescriptionTab from '~/document/types/item/sheet/ItemSheetDescriptionTab.svelte';
   import ItemSheetRulesElementsTab from '~/document/types/item/sheet/rules-element/ItemSheetRulesElementsTab.svelte';
   import Tabs from '~/helpers/svelte-components/Tabs.svelte';

   /** @type object Reference to the Application State store. */
   const appState = getContext('applicationState');

   // Setup tabs
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
      {
         label: localize('rulesElements'),
         id: 'rulesElements',
         component: ItemSheetRulesElementsTab,
      },
   ];
</script>

<Tabs bind:activeTab={$appState.activeTab} border={true} {tabs}/>
