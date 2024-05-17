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
   }

   /** @type CastingCheckParameters Calculated check parameters. */
   let checkParameters;

   // Update parameters in response to changes
   $: {
      const item = $document.items.get(itemId);
      if (item &&
         $document.system.validateCastingCheckOptions(checkOptions)
      ) {
         checkParameters = $document.system.getCastingCheckParameters(
            $document.system.initializeCastingCheckOptions(checkOptions)
         );
      }
   }
</script>
<CharacterSheetCondensedCheckButton
   attribute="{checkParameters.attribute}"
   complexity="{checkParameters.complexity}"
   difficulty="{checkParameters.difficulty}"
   on:click={() => $document.system.requestCastingCheck(checkOptions)}
   totalDice="{checkParameters.totalDice}"
   totalExpertise="{checkParameters.totalExpertise}"
/>
