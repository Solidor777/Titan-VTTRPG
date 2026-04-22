<script>
   import { getContext } from 'svelte';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import CharacterSheetResistanceCheckButton
      from '~/document/types/actor/types/character/sheet/header/CharacterSheetResistanceCheckButton.svelte';
   import ModifiableStatValueLabel from '~/helpers/svelte-components/label/ModifiableStatValueLabel.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';

   /** @type {string} The Resistance that this component represents. */
   export let resistance;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<div class="container" data-resistance={resistance}>
   <!--Resistance Label-->
   <div class="button {resistance}" use:tooltipAction={`${resistance}.desc`}>
      <CharacterSheetResistanceCheckButton {resistance}/>
   </div>

   <!--Stats-->
   <div class="stats">

      <!--Base Value-->
      <div class="number">
         <div class='label'>
            {$document.system.resistance[resistance].baseValue}
         </div>
      </div>

      <!--Plus Sign-->
      <div class="sign">+</div>

      <!--Static Mod-->
      <div class="number">
         <DocumentIntegerInput
            bind:value={$document.system.resistance[resistance].mod.static}
         />
      </div>

      <!--Equal Sign-->
      <div class="sign">=</div>

      <!--Total Value-->
      <div class="number">
         <ModifiableStatValueLabel
            abilityMod={$document.system.resistance[resistance].mod.ability}
            baseTooltip={localize(`${resistance}.baseValue`)}
            baseValue={$document.system.resistance[resistance].baseValue}
            effectMod={$document.system.resistance[resistance].mod.effect}
            equipmentMod={$document.system.resistance[resistance].mod.equipment}
            staticMod={$document.system.resistance[resistance].mod.static}
            value={$document.system.resistance[resistance].value}
         />
      </div>
   </div>
</div>

<style lang="scss">
   .container {
      @include flex-row;
      @include flex-space-evenly;

      width: 100%;

      .button {
         width: 100%;
      }

      .stats {
         @include flex-row;
         @include flex-group-center;

         height: 100%;

         @include margin-left-large;

         :not(:first-child) {
            @include margin-left-standard;
         }

         .sign {
            @include flex-row;
            @include flex-group-center;

            height: 100%;
         }

         .number {
            @include flex-row;
            @include flex-group-center;

            height: 100%;
            width: 28px;
         }

         .label {
            @include bordered-label;

            --titan-label-height: var(--titan-input-height);
            --titan-label-padding: var(--titan-input-padding);
         }
      }
   }
</style>
