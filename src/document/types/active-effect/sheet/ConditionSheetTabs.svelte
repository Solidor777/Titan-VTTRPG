<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ActiveEffectSheetDescriptionTab
   from '~/document/types/active-effect/sheet/ActiveEffectSheetDescriptionTab.svelte';
   import ItemSheetRulesElementsTab from '~/document/types/item/sheet/rules-element/ItemSheetRulesElementsTab.svelte';
   import Tabs from '~/helpers/svelte-components/Tabs.svelte';

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');

   // Setup tabs: a condition has a description and rules elements, no checks.
   const tabs = [
      {
         label: localize('description'),
         id: 'description',
         component: ActiveEffectSheetDescriptionTab,
      },
      {
         label: localize('rulesElements'),
         id: 'rulesElements',
         component: ItemSheetRulesElementsTab,
      },
   ];
</script>

<Tabs bind:activeTab={$appState.tabs.activeTab} border={true} {tabs}/>
