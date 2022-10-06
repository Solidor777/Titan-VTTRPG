<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";
   import DocumentIntegerInput from "~/documents/components/input/DocumentIntegerInput.svelte";
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";
   import ModTag from "~/helpers/svelte-components/tag/ModTag.svelte";

   // The key / name of the resistance
   export let key;

   // Setup context variables
   const document = getContext("DocumentStore");
   const application = getContext("external").application;

   // Calculate the tooltip for the total value
   function getTotalValueTooltip(baseValue, equipment, effect, ability, staticMod) {
      // Base label
      let retVal = `<p>${localize(`${key}.baseValue`)}</p><p>${localize("base")}: ${baseValue}</p>`;

      // Equipment
      if (equipment !== 0) {
         retVal += `<p>${localize("equipment")}: ${equipment}</p>`;
      }

      // Abilities
      if (ability !== 0) {
         retVal += `<p>${localize("abilities")}: ${ability}</p>`;
      }

      // Effects
      if (effect !== 0) {
         retVal += `<p>${localize("effects")}: ${effect}</p>`;
      }

      // Static mod
      if (staticMod !== 0) {
         retVal += `<p>${localize("mod")}: ${staticMod}</p>`;
      }

      return retVal;
   }

   $: totalValueTooltip = getTotalValueTooltip(
      $document.system.resistance[key].baseValue,
      $document.system.resistance[key].mod.equipment,
      $document.system.resistance[key].mod.effect,
      $document.system.resistance[key].mod.ability,
      $document.system.resistance[key].mod.static
   );
</script>

<div class="resistance" data-resistance={key}>
   <!--Resistance Label-->
   <div class="button {key}" data-tooltip={localize(`${key}.desc`)}>
      <EfxButton on:click={application.rollResistanceCheck.bind(application, key)}>
         {localize(`${key}`)}
      </EfxButton>
   </div>

   <!--Stats-->
   <div class="stats">
      <!--Base Value-->
      <div class="input">
         <DocumentIntegerInput bind:value={$document.system.resistance[key].baseValue} />
      </div>
      <div class="label">+</div>

      <!--Static Mod-->
      <div class="input">
         <DocumentIntegerInput bind:value={$document.system.resistance[key].mod.static} />
      </div>
      <div class="label">=</div>

      <!--Total Value-->
      <div class="value" data-tooltip={totalValueTooltip}>
         <ModTag
            currentValue={$document.system.resistance[key].value}
            baseValue={$document.system.resistance[key].baseValue +
               $document.system.resistance[key].mod.effect +
               $document.system.resistance[key].mod.ability}
         />
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";
   .resistance {
      @include flex-row;
      @include flex-space-evenly;
      height: 100%;
      width: 100%;

      .button {
         min-width: 6rem;

         &.reflexes {
            --button-background-color: var(--reflexes-color-bright);
         }

         &.resilience {
            --button-background-color: var(--resilience-color-bright);
         }

         &.willpower {
            --button-background-color: var(--willpower-color-bright);
         }
      }

      .stats {
         @include flex-row;
         @include flex-group-center;
         height: 100%;
         margin-left: 0.25rem;

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
