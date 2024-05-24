<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import {getContext} from 'svelte';
   import AttributeTag from '~/helpers/svelte-components/tag/AttributeTag.svelte';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import {DICE_ICON, EXPERTISE_ICON, TRAINING_ICON} from '~/system/Icons.js';

   /** @type {string} The ID of the item to get the check from. */
   export let item = void 0;

   /** @type TitanActor Reference to the character document. */
   const document = getContext('document');

   /** @type CastingCheckOptions Base options for the Casting Check. */
   const checkOptions = {
      itemId: item._id,
   };

   /** @type CastingCheckParameters Calculated check parameters. */
   let checkParameters;

   // Update the component in response to changes
   $: {
      // Ensure the item is still valid
      if ($document.items.get(item._id)) {

         // Update the parameters
         checkParameters = $document.system.getCastingCheckParameters(
            $document.system.initializeCastingCheckOptions(checkOptions)
         );
      }
   }
</script>

<div class="check">
   <!--Label-->
   <div class="tag">
      <AttributeTag
         attribute={checkParameters.attribute}
         label={`${localize(checkParameters.attribute)} (${localize(checkParameters.skill)})
         ${checkParameters.difficulty}:${checkParameters.complexity}`}
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
         @include tag-margin;
      }
   }
</style>
