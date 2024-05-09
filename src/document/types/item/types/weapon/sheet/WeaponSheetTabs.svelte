<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ItemSheetChecksTab from '~/document/types/item/component/check/ItemSheetChecksTab.svelte';
   import ItemSheetRulesElementsTab from '~/document/types/item/component/rules-element/ItemSheetRulesElementsTab.svelte';
   import WeaponSheetAttacksTab from '~/document/types/item/types/weapon/sheet/WeaponSheetAttacksTab.svelte';
   import WeaponSheetDescriptionTab from '~/document/types/item/types/weapon/sheet/WeaponSheetDescriptionTab.svelte';
   import BorderedTabs from '~/helpers/svelte-components/BorderedTabs.svelte';

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

<BorderedTabs {tabs} bind:activeTab={$appState.activeTab} />
