<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import {getContext} from 'svelte';
   import DocumentIntegerInput from '~/document/sheet/input/DocumentIntegerInput.svelte';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import ModTag from '~/helpers/svelte-components/tag/ModTag.svelte';

   // The key / name of the attribute
   export let key;

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   // Calculate the tooltipAction for the total value
   /**
    * @param baseValue
    * @param equipment
    * @param effect
    * @param ability
    * @param staticMod
    */
   function getTotalValueTooltip(
      baseValue,
      equipment,
      effect,
      ability,
      staticMod,
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

      return retVal;
   }

   $: totalValueTooltip = getTotalValueTooltip(
      $document.system.attribute[key].baseValue,
      $document.system.attribute[key].mod.equipment,
      $document.system.attribute[key].mod.effect,
      $document.system.attribute[key].mod.ability,
      $document.system.attribute[key].mod.static,
   );
</script>

<div class="attribute" data-attribute={key}>
   <!--attribute Label-->
   <div class="button {key}">
      <Button
         on:click={() =>
            $document.system.requestAttributeCheck(
               { attribute: key },
            )}
         tooltip={localize(`${key}.desc`)}
      >
         {localize(key)}
      </Button>
   </div>

   <!--Stats-->
   <div class="stats">
      <!--Base Value-->
      <div class="input">
         <DocumentIntegerInput
            bind:value={$document.system.attribute[key].baseValue}
         />
      </div>
      <div class="label">+</div>

      <!--Static Mod-->
      <div class="input">
         <DocumentIntegerInput
            bind:value={$document.system.attribute[key].mod.static}
         />
      </div>
      <div class="label">=</div>

      <!--Total Value-->
      <div class="value">
         <ModTag
            baseValue={$document.system.attribute[key].baseValue +
               $document.system.attribute[key].mod.equipment +
               $document.system.attribute[key].mod.ability}
            currentValue={$document.system.attribute[key].value}
            tooltip={totalValueTooltip}
         />
      </div>
   </div>
</div>

<style lang="scss">
   .attribute {
      @include flex-row;
      @include flex-space-evenly;

      height: 100%;
      width: 100%;

      .button {
         min-width: 96px;

         @include attribute-button;
      }

      .stats {
         @include flex-row;
         @include flex-group-center;

         height: 100%;
         margin-left: var(--titan-padding-large);

         :not(:first-child) {
            margin-left: var(--titan-padding-standard);
         }

         .input {
            @include flex-row;
            @include flex-group-center;

            height: 100%;
            width: 28px;
         }

         .label {
            @include flex-row;
            @include flex-group-center;

            height: 100%;
         }

         .value {
            @include flex-row;
            @include flex-group-center;

            height: 100%;
            min-width: 28px;
         }
      }
   }
</style>
