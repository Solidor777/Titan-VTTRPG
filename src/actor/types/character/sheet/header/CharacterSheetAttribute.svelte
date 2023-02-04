<script>
   import { localize } from '~/helpers/Utility.js';
   import { getContext } from 'svelte';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import DocumentIntegerInput from '~/documents/components/input/DocumentIntegerInput.svelte';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';
   import ModTag from '~/helpers/svelte-components/tag/ModTag.svelte';

   // The key / name of the attribute
   export let key;

   // Setup context variables
   const document = getContext('DocumentStore');

   // Calculate the tooltip for the total value
   function getTotalValueTooltip(
      baseValue,
      equipment,
      effect,
      ability,
      staticMod
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
      $document.system.attribute[key].mod.static
   );
</script>

<div class="attribute" data-attribute={key}>
   <!--attribute Label-->
   <div class="button {key}" use:tooltip={{ content: localize(`${key}.desc`) }}>
      <EfxButton
         on:click={() =>
            $document.typeComponent.rollAttributeCheck(
               { attribute: key },
               false
            )}
      >
         {localize(key)}
      </EfxButton>
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
      <div class="value" use:tooltip={{ content: totalValueTooltip }}>
         <ModTag
            currentValue={$document.system.attribute[key].value}
            baseValue={$document.system.attribute[key].baseValue +
               $document.system.attribute[key].mod.equipment +
               $document.system.attribute[key].mod.ability}
         />
      </div>
   </div>
</div>

<style lang="scss">
   @import '../../../../../Styles/Mixins.scss';

   .attribute {
      @include flex-row;
      @include flex-space-evenly;
      height: 100%;
      width: 100%;

      .button {
         min-width: 6rem;
         &.body {
            --button-background: var(--body-color);
         }

         &.mind {
            --button-background: var(--mind-color);
         }

         &.soul {
            --button-background: var(--soul-color);
         }
      }

      .stats {
         @include flex-row;
         @include flex-group-center;
         height: 100%;
         margin-left: 0.5rem;

         :not(:first-child) {
            margin-left: 0.25rem;
         }

         .input {
            @include flex-row;
            @include flex-group-center;
            height: 100%;
            width: 1.75rem;
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
            min-width: 1.75rem;
         }
      }
   }
</style>
