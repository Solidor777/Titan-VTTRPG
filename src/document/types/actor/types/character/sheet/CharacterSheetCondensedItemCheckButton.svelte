<script>
   import {getContext} from 'svelte';
   import CharacterSheetCondensedCheckButton
      from "~/document/types/actor/types/character/sheet/CharacterSheetCondensedCheckButton.svelte";

   /** @type string ID of the item to get the check from. */
   export let itemId = void 0;

   /** @type TitanActor Reference to the Character document. */
   const document = getContext('document');

   /** @type ItemCheckParameters Calculated check parameters. */
   const parameters = $document.system.getItemCheckParameters($document.system._initializeItemCheckOptions({
      itemId: itemId,
      checkIdx: 0
   }));

</script>
<CharacterSheetCondensedCheckButton
   complexity="{parameters.complexity}"
   difficulty="{parameters.difficulty}"
   resolveCost="{parameters.resolveCost}"
   totalDice="{parameters.totalDice}"
   totalExpertise="{parameters.totalExpertise}"
/>
