<script>
   import { getContext } from 'svelte';
   import { localize } from '~/helpers/Utility.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';
   import DocumentIntegerInput from '~/documents/components/input/DocumentIntegerInput.svelte';
   import DocumentAttributeSelect from '~/documents/components/select/DocumentAttributeSelect.svelte';
   import ModTag from '~/helpers/svelte-components/tag/ModTag.svelte';

   // Key for the skill
   export let key;

   // Setup context variables
   const document = getContext('DocumentStore');

   // Calculate the tooltip for the total value of training or expertise
   function getTotalValueTooltip(
      baseValue,
      equipment,
      effect,
      ability,
      staticMod,
      mod
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

   $: trainingTotalValueTooltip = getTotalValueTooltip(
      $document.system.skill[key].training.baseValue,
      $document.system.skill[key].training.mod.equipment,
      $document.system.skill[key].training.mod.effect,
      $document.system.skill[key].training.mod.ability,
      $document.system.skill[key].training.mod.static,
      0
   );

   $: expertiseTotalValueTooltip = getTotalValueTooltip(
      $document.system.skill[key].expertise.baseValue,
      $document.system.skill[key].expertise.mod.equipment,
      $document.system.skill[key].expertise.mod.effect,
      $document.system.skill[key].expertise.mod.ability,
      $document.system.skill[key].expertise.mod.static,
      $document.typeComponent.getAttributeCheckMod(
         'expertise',
         $document.system.skill[key].defaultAttribute,
         key
      )
   );

   $: totalDiceTooltip = getTotalDiceTooltip(
      $document.system.attribute[$document.system.skill[key].defaultAttribute]
         .value,
      $document.system.skill[key].training.value,
      $document.typeComponent.getAttributeCheckMod(
         'dice',
         $document.system.skill[key].defaultAttribute,
         key
      )
   );
</script>

<div class="skill">
   <div class="column">
      <!--Roll Button-->
      <div class="button" use:tooltip={{ content: localize(`${key}.desc`) }}>
         <EfxButton
            on:click={() =>
               $document.typeComponent.rollAttributeCheck(
                  { skill: key },
                  false
               )}
         >
            <div class="button-content">
               <!--Icon-->
               <i class="fas fa-dice" />

               <!--Label-->
               <div class="label">
                  {localize(key)}
               </div>
            </div>
         </EfxButton>
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
         <div class="label"><i class="fas fa-dice-d6" />{localize('dice')}</div>

         <!--Total Value-->
         <div class="value">
            {$document.system.skill[key].training.value +
               $document.system.attribute[
                  $document.system.skill[key].defaultAttribute
               ].value +
               $document.typeComponent.getAttributeCheckMod(
                  'dice',
                  $document.system.skill[key].defaultAttribute,
                  key
               )}
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
            <i class="fas fa-graduation-cap" />

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
            <i class="fas fa-dumbbell" />

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
                  $document.typeComponent.getAttributeCheckMod(
                     'expertise',
                     $document.system.skill[key].defaultAttribute,
                     key
                  )}
               baseValue={$document.system.skill[key].expertise.baseValue +
                  $document.system.skill[key].expertise.mod.ability +
                  $document.system.skill[key].expertise.mod.equipment}
            />
         </div>
      </div>
   </div>
</div>

<style lang="scss">
   @import '../../../../../../Styles/Mixins.scss';

   .skill {
      @include flex-row;
      @include flex-space-between;
      @include border;
      @include panel-3;

      width: 100%;
      padding: 0.5rem;

      .column {
         @include flex-column;
         @include flex-group-top;

         height: 100%;

         .button {
            @include flex-row;
            @include flex-group-center;

            min-width: 11rem;

            .button-content {
               @include flex-row;
               @include flex-group-center;
               i {
                  margin-right: 0.25rem;
               }
            }
         }

         .attribute {
            @include flex-row;
            @include flex-group-center;
            height: 100%;
            width: 100%;
            margin-top: 0.25rem;

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
               margin-left: 0.25rem;
               height: 100%;
            }
         }

         .row {
            @include flex-row;
            @include flex-group-right;

            width: 100%;

            &:not(:first-child) {
               @include border-top;
               padding-top: 0.25rem;
               margin-top: 0.25rem;
            }

            .label {
               @include flex-row;
               @include flex-group-right;
               @include font-size-small;
               height: 100%;
               font-weight: bold;
               margin-right: 0.25rem;

               i {
                  margin-right: 0.25rem;
               }
            }

            .input {
               @include flex-row;
               @include flex-group-center;
               height: 100%;
               width: 1.75rem;
               margin-left: 0.25rem;
            }

            .value {
               @include flex-row;
               @include flex-group-center;
               font-weight: normal;
               height: 100%;
               width: 1.75rem;
               margin-left: 0.25rem;
            }

            .symbol {
               @include flex-row;
               @include flex-group-center;
               height: 100%;
               margin-left: 0.25rem;
            }
         }

         .tag {
            @include flex-column;
            @include flex-group-top;
            @include border;
            @include label;
            @include font-size-small;

            padding: 0.25rem;

            .label {
               @include flex-row;
               @include flex-group-center;
               @include border-bottom;
               font-weight: bold;

               i {
                  margin-right: 0.25rem;
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
