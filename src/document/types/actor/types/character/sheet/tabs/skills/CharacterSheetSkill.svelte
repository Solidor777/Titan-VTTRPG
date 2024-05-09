<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import DocumentIntegerInput from '~/document/components/input/DocumentIntegerInput.svelte';
   import DocumentAttributeSelect from '~/document/components/select/DocumentAttributeSelect.svelte';
   import ModTag from '~/helpers/svelte-components/tag/ModTag.svelte';
   import { DICE_ICON, EXPERTISE_ICON, TRAINING_ICON } from '~/system/Icons.js';

   // Key for the skill
   export let key;

   // Setup context variables
   const document = getContext('document');

   // Calculate the tooltip for the total value of training or expertise
   function getTotalValueTooltip(
      baseValue,
      equipment,
      effect,
      ability,
      staticMod,
      mod,
   ) {
      // Base label
      let retVal = `<p>${localize('base')}: ${baseValue}</p>`;

      // Equipment
      if (equipment !== 0) {
         retVal += `<p>${localize('equipment')}: ${equipment}</p>`;
      }

      // Abilities
      if (ability !== 0) {
         retVal += `<p>${localize('abilities')}: ${ability}</p>`;
      }

      // Effects
      if (effect !== 0) {
         retVal += `<p>${localize('effects')}: ${effect}</p>`;
      }

      // Static mod
      if (staticMod !== 0) {
         retVal += `<p>${localize('mod')}: ${staticMod}</p>`;
      }

      // Mod
      if (mod !== 0) {
         retVal += `<p>${localize('mod')}: ${mod}</p>`;
      }

      return retVal;
   }

   // Calculate the tooltip for the total value of training or expertise
   function getTotalDiceTooltip(attribute, training, mod) {
      // Base label
      let retVal = `<p>${localize('skill.totalDice')}</p>`;

      // Training
      if (attribute !== 0) {
         retVal += `<p>${localize('attribute')}: ${attribute}</p>`;
      }

      // Attribute
      if (training !== 0) {
         retVal += `<p>${localize('training')}: ${training}</p>`;
      }

      // Mod
      if (mod !== 0) {
         retVal += `<p>${localize('mod')}: ${mod}</p>`;
      }

      return retVal;
   }

   let diceMod = 0;
   $: diceMod = $document.system.getAttributeCheckMod(
      'dice',
      $document.system.skill[key].defaultAttribute,
      key,
   );

   let expertiseMod = 0;
   $: expertiseMod = $document.system.getAttributeCheckMod(
      'expertise',
      $document.system.skill[key].defaultAttribute,
      key,
   );

   $: trainingTotalValueTooltip = getTotalValueTooltip(
      $document.system.skill[key].training.baseValue,
      $document.system.skill[key].training.mod.equipment,
      $document.system.skill[key].training.mod.effect,
      $document.system.skill[key].training.mod.ability,
      $document.system.skill[key].training.mod.static,
      0,
   );

   $: expertiseTotalValueTooltip = getTotalValueTooltip(
      $document.system.skill[key].expertise.baseValue,
      $document.system.skill[key].expertise.mod.equipment,
      $document.system.skill[key].expertise.mod.effect,
      $document.system.skill[key].expertise.mod.ability,
      $document.system.skill[key].expertise.mod.static,
      expertiseMod,
   );

   $: totalDiceTooltip = getTotalDiceTooltip(
      $document.system.attribute[$document.system.skill[key].defaultAttribute]
         .value,
      $document.system.skill[key].training.value,
      diceMod,
   );
</script>

<div class="skill">
   <div class="column">
      <!--Roll Button-->
      <div class="button" use:tooltip={{ content: localize(`${key}.desc`) }}>
         <Button
            on:click={() =>
               $document.system.requestAttributeCheck(
                  { skill: key },
               )}
         >
            <div class="button-content">
               <!--Icon-->
               <i class="{DICE_ICON}"/>

               <!--Label-->
               <div class="label">
                  {localize(key)}
               </div>
            </div>
         </Button>
      </div>

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
            {$document.system.skill[key].training.value +
            $document.system.attribute[
               $document.system.skill[key].defaultAttribute
               ].value +
            diceMod}
         </div>
      </div>
   </div>

   <!--Training and Expertise-->
   <div class="column">
      <!--Training row-->
      <div class="row">
         <!--Label-->
         <div
            class="label"
            use:tooltip={{ content: localize('training.desc') }}
         >
            <!--Icon-->
            <i class="{EXPERTISE_ICON}"/>

            <!--Inner Label-->
            <div class="inner-label">
               {localize('training')}
            </div>
         </div>

         <!--Base Value-->
         <div class="input">
            <DocumentIntegerInput
               bind:value={$document.system.skill[key].training.baseValue}
            />
         </div>

         <!--Static Mod-->
         <div class="symbol">+</div>
         <div class="input">
            <DocumentIntegerInput
               bind:value={$document.system.skill[key].training.mod.static}
            />
         </div>

         <!--Total Value-->
         <div class="symbol">=</div>
         <div
            class="value"
            use:tooltip={{ content: trainingTotalValueTooltip }}
         >
            <ModTag
               currentValue={$document.system.skill[key].training.value}
               baseValue={$document.system.skill[key].training.baseValue +
                  $document.system.skill[key].training.mod.ability +
                  $document.system.skill[key].training.mod.equipment}
            />
         </div>
      </div>

      <!--Expertise row-->
      <div class="row">
         <!--Label-->
         <div
            class="label"
            use:tooltip={{ content: localize('expertise.desc') }}
         >
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
            <DocumentIntegerInput
               bind:value={$document.system.skill[key].expertise.mod.static}
            />
         </div>

         <!--Total Value-->
         <div class="symbol">=</div>
         <div
            class="value"
            use:tooltip={{ content: expertiseTotalValueTooltip }}
         >
            <ModTag
               currentValue={$document.system.skill[key].expertise.value +
                  expertiseMod}
               baseValue={$document.system.skill[key].expertise.baseValue +
                  $document.system.skill[key].expertise.mod.ability +
                  $document.system.skill[key].expertise.mod.equipment +
                  expertiseMod}
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

            .button-content {
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
