<script>
   import CharacterSheetCondensedSkillCheckButton
   from '~/document/types/actor/types/character/sheet/tabs/skills/CharacterSheetCondensedSkillCheckButton.svelte';
   import DocumentAttributeSelect from '~/document/svelte-components/select/DocumentAttributeSelect.svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import { getContext } from 'svelte';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import ModifiedValueLabel from '~/helpers/svelte-components/label/ModifiedValueLabel.svelte';
   import createModifiableStatTooltip from '~/helpers/utility-functions/CreateModifiableStatTooltip.js';
   import { getInnateModTotal } from '~/system/ModBuckets.js';
   import { areStaticModsShown } from '~/system/StaticMods.js';

   /**
    * @typedef {object} CharacterSheetSkillProps
    * @property {string} key Key for the Skill to show stats for.
    */

   /** @type {CharacterSheetSkillProps} */
   const { key } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {boolean} True when the static modifier inputs are shown. */
   const showStaticMods = $derived(areStaticModsShown(document.data));

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
         <!--Base Value-->
         <div class="input">
            <DocumentIntegerInput
               bind:value={document.data.system.skill[key].training.baseValue}
               testId={`sheet-skill-${key}-training-base`}
            />
         </div>

         {#if showStaticMods}
            <!--Static Mod-->
            <div class="symbol">+</div>
            <div class="input">
               <DocumentIntegerInput
                  bind:value={document.data.system.skill[key].training.mod.static}
                  testId={`sheet-skill-${key}-training-mod`}
               />
            </div>
         {/if}

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
         <!--Base Value-->
         <div class="input">
            <DocumentIntegerInput
               bind:value={document.data.system.skill[key].expertise.baseValue}
               testId={`sheet-skill-${key}-expertise-base`}
            />
         </div>

         {#if showStaticMods}
            <!--Static Mod-->
            <div class="symbol">+</div>
            <div class="input">
               <DocumentIntegerInput
                  bind:value={document.data.system.skill[key].expertise.mod.static}
                  testId={`sheet-skill-${key}-expertise-mod`}
               />
            </div>
         {/if}

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

<style lang="scss">
   // Every cell is aligned to the left and the vertical middle of its track, so when a long skill name wraps onto
   // more lines and the row grows, the other columns stay centered on it while the dividers span the full height.
   // One line per skill on the column tracks defined by the Skills tab (`--skill-columns` and friends), the same
   // tracks the column header uses, so every cell sits under its label. The roll button is as wide as its skill name
   // needs inside the flexible first track; the Attribute select and the two stat groups are fixed-width tracks, each
   // behind a divider.
   .skill {
      @include panel-2;

      align-items: stretch;
      display: grid;
      grid-template-columns: var(--skill-columns);

      // Columns pack from the left; a wider entry leaves trailing space instead of spreading them apart.
      justify-content: start;
      min-width: var(--skill-row-min-width);
      padding: var(--titan-spacing-standard) var(--titan-spacing-standard) var(--titan-spacing-standard)
         var(--titan-spacing-large);
      width: 100%;

      // The button takes its text's width (auto width and height instead of the default fill); the zero minimum
      // width lets a name wider than the track wrap inside the button.
      .check {
         --titan-button-height: auto;
         --titan-button-padding: 3px 10px;
         --titan-button-width: auto;

         align-items: center;
         display: flex;
         justify-content: flex-start;
         justify-self: start;
         max-width: 100%;
         min-width: 0;
      }

      .attribute {
         @include separator-left-large;

         place-content: center start;
         display: grid;
      }

      // The two stat groups span the two trailing tracks and keep their own two-track grid.
      .stats {
         display: grid;
         grid-column: 3 / 5;
         grid-template-columns: repeat(2, var(--skill-stat-track));

         .stat {
            @include separator-left-large;

            place-content: center start;
            align-items: center;
            column-gap: var(--skill-stat-gap);
            display: grid;
            grid-template-columns: var(--skill-stat-columns);

            .input,
            .value {
               @include flex-row;
               @include flex-group-center;

               height: 100%;
            }

            .value {
               font-weight: normal;
            }

            .symbol {
               @include flex-row;
               @include flex-group-center;

               height: 100%;
            }
         }
      }
   }
</style>
