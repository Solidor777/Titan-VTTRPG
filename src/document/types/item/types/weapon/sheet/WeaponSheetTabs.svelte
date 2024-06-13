<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ItemSheetChecksTab from '~/document/types/item/sheet/check/ItemSheetChecksTab.svelte';
   import ItemSheetRulesElementsTab from '~/document/types/item/sheet/rules-element/ItemSheetRulesElementsTab.svelte';
   import WeaponSheetAttacksTab from '~/document/types/item/types/weapon/sheet/WeaponSheetAttacksTab.svelte';
   import WeaponSheetDescriptionTab from '~/document/types/item/types/weapon/sheet/WeaponSheetDescriptionTab.svelte';
   import Tabs from '~/helpers/svelte-components/Tabs.svelte';

   /** @type object Reference to the Application State store. */
   const appState = getContext('applicationState');

   // Tabs
   const tabs = [
      {
         label: localize('description'),
         id: 'description',
         component: WeaponSheetDescriptionTab,
      },
      {
         label: localize('attacks'),
         id: 'attacks',
         component: WeaponSheetAttacksTab,
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

<Tabs bind:activeTab={$appState.activeTab} bordre={true} {tabs}/>
