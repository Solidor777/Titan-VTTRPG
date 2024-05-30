<script>
   import {EXPERTISE_ICON, TRAINING_ICON} from '~/system/Icons.js';
   import CharacterSheetCondensedSkillCheckButton
      from '~/document/types/actor/types/character/sheet/tabs/skills/CharacterSheetCondensedSkillCheckButton.svelte';
   import DocumentAttributeSelect from '~/document/components/select/DocumentAttributeSelect.svelte';
   import DocumentIntegerInput from '~/document/components/input/DocumentIntegerInput.svelte';
   import {getContext} from 'svelte';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ModTag from '~/helpers/svelte-components/tag/ModTag.svelte';

   /** @type string Key for the Skill to show stats for. */
   export let key;

   /** @type TitanActor Reference to the Character Document. */
   const document = getContext('document');

   /** @type AttributeCheckParameters Calculated check parameters. */
   let checkParameters = $document.system.getAttributeCheckParameters(
      $document.system.initializeAttributeCheckOptions({skill: key}));

   /** @type string Tooltip for the total Training value. */
   let totalTrainingTooltip = '';

   /** @type string Tooltip for the total Expertise value. */
   let totalExpertiseTooltip = '';

   /**
    * Calculates the tooltip for the total Training or Expertise value.
    * @param {object} valueObject - The Training or Expertise object.
    * @param {number} mod - Modifier for the total value or expertise.
    * @returns {string} The tooltip for the total Training or Expertise value.
    */
   function getTotalValueTooltip(valueObject, mod) {
      // Base value label
      let retVal = `<p>${localize('base')}: ${valueObject.baseValue}</p>`;

      // Equipment mod
      if (valueObject.mod.equipment) {
         retVal += `<p>${localize('equipment')}: ${valueObject.mod.equipment}</p>`;
      }

      // Ability mod
      if (valueObject.mod.ability) {
         retVal += `<p>${localize('abilities')}: ${valueObject.mod.ability}</p>`;
      }

      // Effects mod
      if (valueObject.mod.effect) {
         retVal += `<p>${localize('effects')}: ${valueObject.mod.effect}</p>`;
      }

      // Static mod
      if (valueObject.mod.static + mod !== 0) {
         retVal += `<p>${localize('mod')}: ${valueObject.mod.static + mod}</p>`;
      }

      return retVal;
   }

   // Update calculated data in response to changes
   $: {
      // Update check parameters
      checkParameters = $document.system.getAttributeCheckParameters(
         $document.system.initializeAttributeCheckOptions({skill: key}));

      // Update total training tooltip
      totalTrainingTooltip = getTotalValueTooltip(
         $document.system.skill[key].training,
         checkParameters.trainingMod
      );
   }
</script>

<div class="skill">
   <!--Button-->
   <div class="label-button">
      <CharacterSheetCondensedSkillCheckButton {checkParameters}/>
   </div>

   <div class="columns">
      <!--Default Attribute-->
      <div class="column">
         <DocumentAttributeSelect bind:value={$document.system.skill[key].defaultAttribute}/>
      </div>


      <!--Training and Expertise-->
      <div class="column">

         <!--Training-->
         <div class="row">

            <!--Label-->
            <div class="label" use:tooltip={{ content: localize('training.desc') }}>

               <!--Icon-->
               <i class="{EXPERTISE_ICON}"/>

               <!--Inner Label-->
               <div class="inner-label">
                  {localize('training')}
               </div>
            </div>

            <!--Base Value-->
            <div class="input">
               <DocumentIntegerInput bind:value={$document.system.skill[key].training.baseValue}/>
            </div>

            <!--Static Mod-->
            <div class="symbol">+</div>
            <div class="input">
               <DocumentIntegerInput bind:value={$document.system.skill[key].training.mod.static}/>
            </div>

            <!--Total Value-->
            <div class="symbol">=</div>
            <div class="value" use:tooltip={{ content: totalTrainingTooltip}}>
               <ModTag
                  baseValue={
               $document.system.skill[key].training.baseValue +
               $document.system.skill[key].training.mod.ability +
               $document.system.skill[key].training.mod.equipment +
               checkParameters.trainingMod
               }
                  currentValue={checkParameters.totalTrainingDice}
               />
            </div>
         </div>

         <!--Expertise row-->
         <div class="row">
            <!--Label-->
            <div class="label" use:tooltip={{ content: localize('expertise.desc') }}>

               <!--Icon-->
               <i class="{TRAINING_ICON}"/>

               <!--Inner Label-->
               <div class="inner-label">
                  {localize('expertise')}
               </div>
            </div>

            <!--Base Value-->
            <div class="input">
               <DocumentIntegerInput
                  bind:value={$document.system.skill[key].expertise.baseValue}
               />
            </div>

            <!--Static Mod-->
            <div class="symbol">+</div>
            <div class="input">
               <DocumentIntegerInput bind:value={$document.system.skill[key].expertise.mod.static}/>
            </div>

            <!--Total Value-->
            <div class="symbol">=</div>
            <div class="value" use:tooltip={{ content: totalExpertiseTooltip }}>
               <ModTag
                  baseValue={
                  $document.system.skill[key].expertise.baseValue +
                  $document.system.skill[key].expertise.mod.ability +
                  $document.system.skill[key].expertise.mod.equipment +
                  checkParameters.expertiseMod
               }
                  currentValue={checkParameters.totalExpertise}
               />
            </div>
         </div>
      </div>
   </div>


</div>

<style lang="scss">
   .skill {
      @include flex-row;
      @include flex-space-between;
      @include border-top-bottom-right;
      @include panel-3;

      width: 100%;
      padding: var(--titan-padding-standard) var(--titan-padding-standard) var(--titan-padding-standard) var(--titan-padding-large);

      .label-button {
         @include flex-column;
         @include flex-group-left;
      }

      .test {
         font-weight: bold;
      }

      .columns {
         @include flex-row;
         @include flex-space-between;

         .column {
            @include flex-column;
            @include flex-group-top;

            &:not(:first-child) {
               margin-left: var(--titan-padding-large);

               .row {
                  @include flex-row;
                  @include flex-group-right;

                  width: 100%;

                  &:not(:first-child) {
                     @include border-top;

                     padding-top: var(--titan-padding-standard);
                     margin-top: var(--titan-padding-standard);
                  }

                  .label {
                     @include flex-row;
                     @include flex-group-right;
                     @include font-size-small;

                     height: 100%;
                     font-weight: bold;
                     margin-right: var(--titan-padding-standard);

                     i {
                        margin-right: var(--titan-padding-standard);
                     }
                  }

                  .input {
                     @include flex-row;
                     @include flex-group-center;

                     height: 100%;
                     width: 28px;
                     margin-left: var(--titan-padding-standard);
                  }

                  .value {
                     @include flex-row;
                     @include flex-group-center;

                     font-weight: normal;
                     height: 100%;
                     width: 28px;
                     margin-left: var(--titan-padding-standard);
                  }

                  .symbol {
                     @include flex-row;
                     @include flex-group-center;

                     height: 100%;
                     margin-left: var(--titan-padding-standard);
                  }
               }

               .tag {
                  @include flex-column;
                  @include flex-group-top;
                  @include border;
                  @include label;
                  @include font-size-small;

                  padding: var(--titan-padding-standard);

                  .label {
                     @include flex-row;
                     @include flex-group-center;
                     @include border-bottom;

                     font-weight: bold;

                     i {
                        margin-right: var(--titan-padding-standard);
                     }
                  }

                  .value {
                     @include flex-row;
                     @include flex-group-center;
                  }
               }
            }
         }
      }
   }
</style>
