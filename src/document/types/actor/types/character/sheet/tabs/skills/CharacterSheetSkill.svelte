<script>
   import { EXPERTISE_ICON, TRAINING_ICON } from '~/system/Icons.js';
   import CharacterSheetCondensedSkillCheckButton
   from '~/document/types/actor/types/character/sheet/tabs/skills/CharacterSheetCondensedSkillCheckButton.svelte';
   import DocumentAttributeSelect from '~/document/svelte-components/select/DocumentAttributeSelect.svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import { getContext } from 'svelte';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ModifiedValueLabel from '~/helpers/svelte-components/label/ModifiedValueLabel.svelte';

   /**
    * @typedef {object} CharacterSheetSkillProps
    * @property {string} key Key for the Skill to show stats for.
    */

   /** @type {CharacterSheetSkillProps} */
   const { key } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {AttributeCheckParameters} Resolved dice and modifiers for this skill's check. */
   let checkParameters = $derived(
      document.data.system.getAttributeCheckParameters(
         document.data.system.initializeAttributeCheckOptions({ skill: key })),
   );

   /**
    * Calculates the tooltipAction for the total Training or Expertise value.
    * @param {object} valueObject - The Training or Expertise object.
    * @param {number} mod - Modifier for the total value or expertise.
    * @returns {string} The tooltipAction for the total Training or Expertise value.
    */
   function getTotalValueTooltip(valueObject, mod) {
      // Base value label.
      /** @type {string} */
      let retVal = `<p>${localize('base')}: ${valueObject.baseValue}</p>`;

      // Equipment mod.
      if (valueObject.mod.equipment) {
         retVal += `<p>${localize('equipment')}: ${valueObject.mod.equipment}</p>`;
      }

      // Ability mod.
      if (valueObject.mod.ability) {
         retVal += `<p>${localize('abilities')}: ${valueObject.mod.ability}</p>`;
      }

      // Effects mod.
      if (valueObject.mod.effect) {
         retVal += `<p>${localize('effects')}: ${valueObject.mod.effect}</p>`;
      }

      // Static mod.
      if (valueObject.mod.static + mod !== 0) {
         retVal += `<p>${localize('mod')}: ${valueObject.mod.static + mod}</p>`;
      }

      return retVal;
   }

   /** @type {string} Tooltip for the total Training value. */
   let totalTrainingTooltip = $derived(
      getTotalValueTooltip(
         document.data.system.skill[key].training,
         checkParameters.trainingMod,
      ),
   );

   /** @type {string} Tooltip for the total Expertise value. */
   let totalExpertiseTooltip = $derived(
      getTotalValueTooltip(
         document.data.system.skill[key].expertise,
         checkParameters.expertiseMod,
      ),
   );
</script>

<div class="skill">
   <!--Check button-->
   <CharacterSheetCondensedSkillCheckButton {checkParameters}/>

   <!--Default Attribute-->
   <div class="attribute" use:tooltipAction={'defaultAttribute.desc'}>
      <DocumentAttributeSelect bind:value={document.data.system.skill[key].defaultAttribute}/>
   </div>

   <!--Training and Expertise stats-->
   <div class="stats">

      <!--Training-->
      <div class="stat">
         <i class={TRAINING_ICON} use:tooltipAction={'training.desc'}></i>

         <!--Base Value-->
         <div class="input">
            <DocumentIntegerInput bind:value={document.data.system.skill[key].training.baseValue}/>
         </div>

         <!--Static Mod-->
         <div class="symbol">+</div>
         <div class="input">
            <DocumentIntegerInput bind:value={document.data.system.skill[key].training.mod.static}/>
         </div>

         <!--Total Value-->
         <div class="symbol">=</div>
         <div class="value">
            <ModifiedValueLabel
               baseValue={
                  document.data.system.skill[key].training.baseValue +
                     document.data.system.skill[key].training.mod.ability +
                     document.data.system.skill[key].training.mod.equipment +
                     checkParameters.trainingMod
               }
               currentValue={checkParameters.totalTrainingDice}
               tooltip={{
                  text: totalTrainingTooltip,
                  localize: false,
               }}
            />
         </div>
      </div>

      <!--Expertise-->
      <div class="stat">
         <i class={EXPERTISE_ICON} use:tooltipAction={'expertise.desc'}></i>

         <!--Base Value-->
         <div class="input">
            <DocumentIntegerInput bind:value={document.data.system.skill[key].expertise.baseValue}/>
         </div>

         <!--Static Mod-->
         <div class="symbol">+</div>
         <div class="input">
            <DocumentIntegerInput bind:value={document.data.system.skill[key].expertise.mod.static}/>
         </div>

         <!--Total Value-->
         <div class="symbol">=</div>
         <div class="value">
            <ModifiedValueLabel
               baseValue={
                  document.data.system.skill[key].expertise.baseValue +
                     document.data.system.skill[key].expertise.mod.ability +
                     document.data.system.skill[key].expertise.mod.equipment +
                     checkParameters.expertiseMod
               }
               currentValue={checkParameters.totalExpertise}
               tooltip={{
                  text: totalExpertiseTooltip,
                  localize: false,
               }}
            />
         </div>
      </div>
   </div>
</div>

<style lang="scss">
   .skill {
      @include flex-row;
      @include flex-space-between;
      @include panel-2;

      align-items: center;
      gap: var(--titan-spacing-standard);
      width: 100%;
      padding: var(--titan-spacing-standard) var(--titan-spacing-standard) var(--titan-spacing-standard)
         var(--titan-spacing-large);

      .attribute {
         @include flex-row;
         @include flex-group-center;
      }

      .stats {
         @include flex-row;
         @include flex-group-right;

         // The two stat groups keep their full width; the check button and select absorb any squeeze.
         flex-shrink: 0;

         .stat {
            @include flex-row;
            @include flex-group-right;

            height: 100%;

            &:not(:first-child) {
               @include margin-left-large;
            }

            i {
               @include margin-right-standard;
            }

            .input {
               @include flex-row;
               @include flex-group-center;

               height: 100%;
               width: 28px;

               @include margin-left-standard;
            }

            .value {
               @include flex-row;
               @include flex-group-center;

               font-weight: normal;
               height: 100%;
               width: 28px;

               @include margin-left-standard;
            }

            .symbol {
               @include flex-row;
               @include flex-group-center;

               height: 100%;

               @include margin-left-standard;
            }
         }
      }
   }
</style>
