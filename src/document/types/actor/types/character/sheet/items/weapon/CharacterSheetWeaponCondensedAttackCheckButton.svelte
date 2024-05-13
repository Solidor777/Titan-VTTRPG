<script>
   import {getContext} from 'svelte';
   import {ACCURACY_ICON, MELEE_ICON} from "~/system/Icons.js";
   import CharacterSheetCondensedCheckButton
      from "~/document/types/actor/types/character/sheet/CharacterSheetCondensedCheckButton.svelte";

   /** @type string ID of the item to get the check from. */
   export let itemId = void 0;

   /** @type TitanActor Reference to the character document. */
   const document = getContext('document');

   /** @type AttackCheckParameters Calculated check parameters. */
   const parameters = $document.system.getAttackCheckParameters($document.system._initializeAttackCheckOptions({
      itemId: itemId,
   }));

</script>
<CharacterSheetCondensedCheckButton
   checkIcon="{parameters.type === 'melee' ? MELEE_ICON : ACCURACY_ICON}"
   totalDice="{parameters.totalDice}"
   totalExpertise="{parameters.totalExpertise}"
/>
