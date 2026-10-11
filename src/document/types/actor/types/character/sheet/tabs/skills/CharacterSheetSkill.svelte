<script>
   import { EXPERTISE_ICON, TRAINING_ICON } from '~/system/Icons.js';
   import CharacterSheetCondensedSkillCheckButton
   from '~/document/types/actor/types/character/sheet/tabs/skills/CharacterSheetCondensedSkillCheckButton.svelte';
   import DocumentAttributeSelect from '~/document/svelte-components/select/DocumentAttributeSelect.svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import { getContext } from 'svelte';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import ModifiedValueLabel from '~/helpers/svelte-components/label/ModifiedValueLabel.svelte';
   import createModifiableStatTooltip from '~/helpers/utility-functions/CreateModifiableStatTooltip.js';
   import { getInnateModTotal } from '~/system/ModBuckets.js';

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
    * Calculates the breakdown tooltip for the total Training or Expertise value.
    * @param {object} valueObject - The Training or Expertise object.
    * @param {number} mod - The check's conditional modifier to the total Training or Expertise.
    * @returns {string} The breakdown tooltip.
    */
   function getTotalValueTooltip(valueObject, mod) {
      return createModifiableStatTooltip(valueObject.baseValue, valueObject.mod, mod);
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
   <div class="check">
      <CharacterSheetCondensedSkillCheckButton {checkParameters}/>
   </div>

   <!--Attribute, Training and Expertise-->
   <div class="column">

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
               <DocumentIntegerInput
                  bind:value={document.data.system.skill[key].training.baseValue}
                  testId={`sheet-skill-${key}-training-base`}
               />
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
                        getInnateModTotal(document.data.system.skill[key].training.mod) +
                        checkParameters.trainingMod
                  }
                  currentValue={checkParameters.totalTrainingDice}
                  testId={`sheet-skill-${key}-training`}
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
               <DocumentIntegerInput
                  bind:value={document.data.system.skill[key].expertise.baseValue}
                  testId={`sheet-skill-${key}-expertise-base`}
               />
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
                        getInnateModTotal(document.data.system.skill[key].expertise.mod) +
                        checkParameters.expertiseMod
                  }
                  currentValue={checkParameters.totalExpertise}
                  testId={`sheet-skill-${key}-expertise`}
                  tooltip={{
                     text: totalExpertiseTooltip,
                     localize: false,
                  }}
               />
            </div>
         </div>
      </div>
   </div>
</div>

<style lang="scss">
   // The roll button is as wide as its skill name needs and no wider. Only when the name is wider than the row leaves
   // beside the right-hand column does the button shrink, and then the name wraps inside it. The Attribute select,
   // Training and Expertise are one fixed-size column against the right edge, so every row places them identically.
   .skill {
      @include flex-row;
      @include panel-2;

      align-items: flex-start;
      gap: var(--titan-spacing-standard);
      width: 100%;
      padding: var(--titan-spacing-standard) var(--titan-spacing-standard) var(--titan-spacing-standard)
         var(--titan-spacing-large);

      // The button takes its text's width (auto width and height instead of the default fill) and the column
      // shrinks with the row; the zero minimum width lets a long name wrap inside the button.
      .check {
         --titan-button-height: auto;
         --titan-button-width: auto;

         display: block;
         flex: 0 1 auto;
         min-width: 0;
      }

      .column {
         @include flex-column;

         align-items: flex-start;
         flex: 0 0 auto;
         gap: var(--titan-spacing-standard);
         margin-left: auto;
      }

      // Fits the widest attribute select (icon, label and chevron, measured 97px).
      .attribute {
         display: grid;
         flex: 0 0 100px;
         width: 100px;
      }

      .stats {
         @include flex-column;

         align-items: flex-start;
         gap: var(--titan-spacing-standard);

         .stat {
            @include flex-row;
            @include flex-group-right;

            height: 100%;

            // Fixed glyph boxes keep both stat groups the same width whatever the glyph metrics.
            i {
               width: 16px;
               text-align: center;

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
               width: 10px;

               @include margin-left-standard;
            }
         }
      }
   }
</style>
