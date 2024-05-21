<script>
   import {getContext} from 'svelte';
   import {ACCURACY_ICON, MELEE_ICON} from "~/system/Icons.js";
   import CharacterSheetCondensedCheckButton
      from "~/document/types/actor/types/character/sheet/CharacterSheetCondensedCheckButton.svelte";

   /** @type string ID of the item to get the check from. */
   export let itemId = void 0;

   /** @type TitanActor Reference to the Character document. */
   const document = getContext('document');

   const checkOptions = {
      itemId: itemId,
   }

   /** @type AttackCheckParameters Calculated check parameters. */
   let checkParameters;
   let icon;

   // Update parameters in response to changes
   $: {
      const item = $document.items.get(itemId);
      if (item &&
         item.system.attack.length > 0
      ) {
         checkParameters = $document.system.getAttackCheckParameters(
            $document.system.initializeAttackCheckOptions(checkOptions)
         );
         icon = checkParameters.type === 'melee' ? MELEE_ICON : ACCURACY_ICON;
      }
   }
</script>
<CharacterSheetCondensedCheckButton
   attribute="{checkParameters.attribute}"
   checkIcon="{icon}"
   on:click={() => $document.system.requestAttackCheck(checkOptions)}
   totalDice="{checkParameters.totalDice}"
   totalExpertise="{checkParameters.totalExpertise}"
/>
