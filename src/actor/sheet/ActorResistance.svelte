<script>
   import { preventDefault } from "~/helpers/svelte-actions/PreventDefault.js";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { getContext } from "svelte";
   import DocumentTextInput from "~/documents/components/DocumentTextInput.svelte";

   // The key / name of the resistance
   export let key;

   // The Actor Data
   const document = getContext("DocumentSheetObject");

   // The resistance data
   $: resistance = $document.system.resistance[key];

   async function rollResistance(resistance) {
      $document.rollResistanceCheck({
         resistance: resistance,
         getOptions: true,
      });
   }
</script>

<div class="resistance" data-resistance={key}>
   <!--Resistance Label-->
   <button
      class="resistance-roll {key}"
      data-titan-tooltip={localize(`LOCAL.${key}.desc.label`)}
      on:click={rollResistance(key)}
      on:mousedown={preventDefault}
   >
      {localize(`LOCAL.${key}.label`)}
   </button>

   <!--Stats-->
   <div class="stats">
      <!--Base Value-->
      <div class="label" data-titan-tooltip={localize(`LOCAL.${key}.baseValue.label`)}>
         {resistance.baseValue}
      </div>
      <div class="label">+</div>

      <!--Static Mod-->
      <div class="static-mod" data-titan-tooltip={localize(`LOCAL.${key}.editStaticMod.label`)}>
         <DocumentTextInput bind:value={$document.system.resistance[key].staticMod} type="integer" />
      </div>
      <div class="label">=</div>

      <!--Total Value-->
      <div class="label" data-titan-tooltip={localize(`LOCAL.${key}.value.label`)}>
         {resistance.value}
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";

   .resistance {
      @include flex-row;
      width: 100%;
      align-items: center;
      justify-content: space-between;

      button {
         @include border-normal;
         border-radius: 25px;
         width: 6rem;
         font-weight: bold;
         border-color: var(--border-color-normal);

         &.reflexes {
            background-color: var(--color-reflexes-bright);
         }

         &.resilience {
            background-color: var(--color-resilience-bright);
         }

         &.willpower {
            background-color: var(--color-willpower-bright);
         }
      }

      .label {
         font-weight: bold;
      }

      .stats {
         @include flex-row;
         align-items: center;

         :not(:first-child) {
            margin-left: 0.25rem;
         }

         .static-mod {
            width: 1.8rem;
            --border-radius-input: 10px;
         }
      }
   }
</style>
