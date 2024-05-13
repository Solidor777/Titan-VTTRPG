<script>
   import BorderedTabs from '~/helpers/svelte-components/BorderedTabs.svelte';
   import CharacterSheetAbilitiesTab
      from '~/document/types/actor/types/character/sheet/tabs/CharacterSheetAbilitiesTab.svelte';
   import CharacterSheetEffectsTab
      from '~/document/types/actor/types/character/sheet/tabs/CharacterSheetEffectsTab.svelte';
   import CharacterSheetInventoryTab
      from '~/document/types/actor/types/character/sheet/tabs/inventory/CharacterSheetInventoryTab.svelte';
   import CharacterSheetNotesTab from '~/document/types/actor/types/character/sheet/tabs/CharacterSheetNotesTab.svelte';
   import CharacterSheetSkillsTab
      from '~/document/types/actor/types/character/sheet/tabs/skills/CharacterSheetSkillsTab.svelte';
   import CharacterSheetSpellsTab
      from '~/document/types/actor/types/character/sheet/tabs/CharacterSheetSpellsTab.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {getContext} from 'svelte';

   const appState = getContext('applicationState');

   // Tabs
   const tabs = [
      {
         label: localize('skills'),
         id: 'skills',
         component: CharacterSheetSkillsTab,
      },
      {
         label: localize('inventory'),
         id: 'inventory',
         component: CharacterSheetInventoryTab,
      },
      {
         label: localize('abilities'),
         id: 'abilities',
         component: CharacterSheetAbilitiesTab,
      },
      {
         label: localize('spells'),
         id: 'spells',
         component: CharacterSheetSpellsTab,
      },
      {
         label: localize('effects'),
         id: 'effects',
         component: CharacterSheetEffectsTab,
      },
      {
         label: localize('notes'),
         id: 'notes',
         component: CharacterSheetNotesTab,
      },
   ];
</script>

<BorderedTabs bind:activeTab={$appState.activeTab} {tabs}/>
