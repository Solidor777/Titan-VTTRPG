<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ItemSheetChecksTab from '~/document/types/item/component/check/ItemSheetChecksTab.svelte';
   import ItemSheetDescriptionTab from '~/document/types/item/sheet/ItemSheetDescriptionTab.svelte';
   import ItemSheetRulesElementsTab from '~/document/types/item/component/rules-element/ItemSheetRulesElementsTab.svelte';
   import BorderedTabs from '~/helpers/svelte-components/BorderedTabs.svelte';

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

<BorderedTabs {tabs} bind:activeTab={$appState.activeTab} />
