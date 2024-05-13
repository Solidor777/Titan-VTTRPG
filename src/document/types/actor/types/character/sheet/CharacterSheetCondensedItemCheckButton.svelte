<script>
   import {getContext} from 'svelte';
   import CharacterSheetCondensedCheckButton
      from "~/document/types/actor/types/character/sheet/CharacterSheetCondensedCheckButton.svelte";

   /** @type string ID of the item to get the check from. */
   export let itemId = void 0;

   /** @type TitanActor Reference to the Character document. */
   const document = getContext('document');

   const checkOptions = {
      itemId: itemId,
      checkIdx: 0
   }

   /** @type ItemCheckParameters Calculated check parameters. */
   let checkParameters;

   // Update parameters in response to chanes
   $: {
      const item = $document.items.get(itemId);
      if (item &&
         item.system.check.length > 0 &&
         $document.system.validateItemCheckOptions(checkOptions)
      ) {
         checkParameters = $document.system.getItemCheckParameters(
            $document.system.initializeItemCheckOptions({
               itemId: itemId,
               checkIdx: 0
            })
         );
      }
   }
</script>
<CharacterSheetCondensedCheckButton
   attribute="{checkParameters.attribute}"
   complexity="{checkParameters.complexity}"
   difficulty="{checkParameters.difficulty}"
   on:click={() => $document.system.requestItemCheck(checkOptions)}
   resolveCost="{checkParameters.resolveCost}"
   totalDice="{checkParameters.totalDice}"
   totalExpertise="{checkParameters.totalExpertise}"
/>
