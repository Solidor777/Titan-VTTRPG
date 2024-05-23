<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import DocumentIntegerInput from '~/document/components/input/DocumentIntegerInput.svelte';
   import DocumentAttributeSelect from '~/document/components/select/DocumentAttributeSelect.svelte';
   import ModTag from '~/helpers/svelte-components/tag/ModTag.svelte';
   import {DICE_ICON, EXPERTISE_ICON, TRAINING_ICON} from '~/system/Icons.js';

   /** @type string Key for the Skill to show stats for. */
   export let key;

   /** @type TitanActor Reference to the Character document. */
   const document = getContext('document');

   /** @type AttributeCheckParameters Calculated check parameters. */
   let checkParameters = $document.system.getAttributeCheckParameters(
      $document.system.initializeAttributeCheckOptions({skill: key}));

   /** @type string Tooltip for the total Training value. */
   let totalTrainingTooltip = '';

   /** @type string Tooltip for the total Expertise value. */
   let totalExpertiseTooltip = '';

   /** @type string Tooltip for the total Dice value. */
   let totalDiceTooltip = '';

   /**
    * Calculates the tooltip for the total Training or Expertise value.
    * @param {object} valueObject - The Training or Expertise object.
    * @param {number} mod - Modifier for the total value or expertise.
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

      // Update total expertise tooltip
      totalExpertiseTooltip = getTotalValueTooltip(
         $document.system.skill[key].expertise,
         checkParameters.expertiseMod
      );

      // Update total dice tooltip
      // Base label
      totalDiceTooltip = `<p>${localize('skill.totalDice')}</p>`;

      // Attribute
      if (checkParameters.attributeDice) {
         totalDiceTooltip += `<p>${localize('attribute')}: ${checkParameters.attributeDice}</p>`;
      }

      // Training
      if (checkParameters.totalTrainingDice) {
         totalDiceTooltip += `<p>${localize('training')}: ${checkParameters.totalTrainingDice}</p>`;
      }

      // Mod
      if (checkParameters.diceMod) {
         totalDiceTooltip += `<p>${localize('mod')}: ${checkParameters.diceMod}</p>`;
      }
   }
</script>

<div class="skill">
   <!--Label Button-->
   <div class="label-button">
      <Button
         on:click={() =>$document.system.requestAttributeCheck({ skill: key })}
         tooltip={localize(`${key}.desc`)}
      >
         <div class="button-inner">
            <!--Icon-->
            <i class="{DICE_ICON}"/>

            <!--Label-->
            <div class="label">
               {localize(key)}
            </div>
         </div>
      </Button>

      <!--Default Attribute-->
      <div class="attribute">
         <!--Label-->
         <div
            class="label"
            use:tooltip={{ content: localize('defaultAttribute.desc') }}
         >
            {localize('attribute')}
         </div>

         <!--Select-->
         <div class="select">
            <DocumentAttributeSelect
               bind:value={$document.system.skill[key].defaultAttribute}
            />
         </div>
      </div>
   </div>

   <!--Total Dice-->
   <div class="column">
      <div class="tag" use:tooltip={{ content: totalDiceTooltip }}>
         <!--Label-->
         <div class="label"><i class="{DICE_ICON}"/>{localize('dice')}</div>

         <!--Total Value-->
         <div class="value">
            {checkParameters.totalDice}
         </div>
      </div>
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

<style lang="scss">
   .skill {
      @include flex-row;
      @include flex-space-between;
      @include border;
      @include panel-3;

      width: 100%;
      padding: var(--padding-large);

      .column {
         @include flex-column;
         @include flex-group-top;

         height: 100%;

         .button {
            @include flex-row;
            @include flex-group-center;

            min-width: 116px;

            .button-inner {
               @include flex-row;
               @include flex-group-center;

               i {
                  margin-right: var(--padding-standard);
               }
            }
         }

         .attribute {
            @include flex-row;
            @include flex-group-center;

            height: 100%;
            width: 100%;
            margin-top: var(--padding-standard);

            .label {
               @include flex-row;
               @include flex-group-center;
               @include font-size-small;
               height: 100%;
               font-weight: bold;
            }

            .select {
               @include flex-row;
               @include flex-group-center;
               margin-left: var(--padding-standard);
               height: 100%;
            }
         }

         .row {
            @include flex-row;
            @include flex-group-right;

            width: 100%;

            &:not(:first-child) {
               @include border-top;
               padding-top: var(--padding-standard);
               margin-top: var(--padding-standard);
            }

            .label {
               @include flex-row;
               @include flex-group-right;
               @include font-size-small;
               height: 100%;
               font-weight: bold;
               margin-right: var(--padding-standard);

               i {
                  margin-right: var(--padding-standard);
               }
            }

            .input {
               @include flex-row;
               @include flex-group-center;
               height: 100%;
               width: 28px;
               margin-left: var(--padding-standard);
            }

            .value {
               @include flex-row;
               @include flex-group-center;
               font-weight: normal;
               height: 100%;
               width: 28px;
               margin-left: var(--padding-standard);
            }

            .symbol {
               @include flex-row;
               @include flex-group-center;
               height: 100%;
               margin-left: var(--padding-standard);
            }
         }

         .tag {
            @include flex-column;
            @include flex-group-top;
            @include border;
            @include label;
            @include font-size-small;

            padding: var(--padding-standard);

            .label {
               @include flex-row;
               @include flex-group-center;
               @include border-bottom;
               font-weight: bold;

               i {
                  margin-right: var(--padding-standard);
               }
            }

            .value {
               @include flex-row;
               @include flex-group-center;
            }
         }
      }
   }
</style>
