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
                     getInnateModTotal(document.data.system.skill[key].training.mod) +
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
                     getInnateModTotal(document.data.system.skill[key].expertise.mod) +
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
   // Every part has a fixed size, so every row places its parts identically. The check button grows into any
   // spare width and never shrinks below its basis; the stats sit against the right edge. When the row is
   // narrower than the full layout it wraps, and because wrapping depends only on the container width, every
   // row wraps at the same point.
   .skill {
      @include flex-row;
      @include panel-2;

      flex-wrap: wrap;
      align-items: center;
      gap: var(--titan-spacing-standard);
      width: 100%;
      padding: var(--titan-spacing-standard) var(--titan-spacing-standard) var(--titan-spacing-standard)
         var(--titan-spacing-large);

      // Basis fits the widest English skill button ("Investigation", measured 161px with a one-digit dice
      // count) plus room for a two-digit count. Grid stretches the button component to the column width.
      .check {
         display: grid;
         flex: 1 0 172px;
      }

      // Fits the widest attribute select (icon, label and chevron, measured 97px).
      .attribute {
         display: grid;
         flex: 0 0 100px;
      }

      .stats {
         @include flex-row;
         @include flex-group-right;

         flex: 0 0 auto;
         margin-left: auto;

         .stat {
            @include flex-row;
            @include flex-group-right;

            height: 100%;

            &:not(:first-child) {
               @include margin-left-large;
            }

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
