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

   /** @type {object} The embedded spell bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The owning sheet's actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');

   // The item id is fixed for this component's lifetime (provider instances are id-keyed); capturing
   // once in checkOptions is intentional.
   /** @type {CastingCheckOptions} Base options for the Casting Check. */
   const checkOptions = {
      itemId: document.doc._id,
   };

   /** @type {CastingCheckParameters} Resolved dice and modifiers for the spell's casting check. */
   let checkParameters = $derived.by(() => {

      // Ensure the item is still valid.
      if (document.data) {

         // Update the parameters.
         return sheetDocument.data.system.getCastingCheckParameters(
            sheetDocument.data.system.initializeCastingCheckOptions(checkOptions)
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
