<script>
   import CharacterSheetCondensedCheckButton
      from "~/document/types/actor/types/character/sheet/CharacterSheetCondensedCheckButton.svelte";

   /** @type AttributeCheckParameters The parameters for the Check */
   export let checkParameters;

   /** @type string Tooltip for the check stats. */

</script>
<CharacterSheetCondensedCheckButton
   attribute="{checkParameters.attribute}"
   checkIcon="{icon}"
   on:click={() => $document.system.requestAttackCheck(checkOptions)}
   totalDice="{checkParameters.totalDice}"
   totalExpertise="{checkParameters.totalExpertise}"
/>