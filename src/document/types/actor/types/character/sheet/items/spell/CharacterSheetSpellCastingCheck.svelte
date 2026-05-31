<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import {
      DICE_ICON,
      EXPERTISE_ICON,
      TRAINING_ICON,
   } from '~/system/Icons.js';
   import AttributeCheckTag from '~/helpers/svelte-components/tag/AttributeCheckTag.svelte';

   /**
    * @typedef {object} CharacterSheetSpellCastingCheckProps
    * @property {TitanItem} [item] The Item this component belongs to.
    */

   /** @type {CharacterSheetSpellCastingCheckProps} */
   const { item = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   // item is fixed per mounted instance; capturing item._id once in checkOptions is intentional.
   // svelte-ignore state_referenced_locally
   /** @type {CastingCheckOptions} Base options for the Casting Check. */
   const checkOptions = {
      itemId: item._id,
   };

   /** @type {CastingCheckParameters} Resolved dice and modifiers for the spell's casting check. */
   let checkParameters = $derived.by(() => {

      // Ensure the item is still valid.
      if (document.data.items.get(item._id)) {

         // Update the parameters.
         return document.data.system.getCastingCheckParameters(
            document.data.system.initializeCastingCheckOptions(checkOptions)
         );
      }
      return undefined;
   });
</script>

<div class="check">
   <!--Label-->
   <div class="tag">
      <AttributeCheckTag
         attribute={checkParameters.attribute}
         complexity={checkParameters.complexity}
         difficulty={checkParameters.difficulty}
         skill={checkParameters.skill}
      />
   </div>

   <!--Dice-->
   <div class="tag">
      <IconStatTag
         icon={DICE_ICON}
         label={localize('dice')}
         value={checkParameters.totalDice}
      />
   </div>

   <!--Training-->
   {#if checkParameters.totalTrainingDice}
      <div class="tag">
         <IconStatTag
            label={localize('training')}
            value={checkParameters.totalTrainingDice}
            icon={TRAINING_ICON}
         />
      </div>
   {/if}

   <!--Expertise-->
   {#if checkParameters.totalExpertise}
      <div class="tag">
         <IconStatTag
            label={localize('expertise')}
            value={checkParameters.totalExpertise}
            icon={EXPERTISE_ICON}
         />
      </div>
   {/if}
</div>

<style lang="scss">
   .check {
      @include flex-row;
      @include flex-space-evenly;
      @include font-size-small;

      flex-wrap: wrap;

      .tag {
         @include tag-container-child-margin;
      }
   }
</style>
