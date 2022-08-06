<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { getContext } from "svelte";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import DocumentIntegerInput from "~/documents/components/DocumentIntegerInput.svelte";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";

   // The key / name of the resistance
   export let key;

   // The Actor Data
   const document = getContext("DocumentSheetObject");

   // The resistance data
   $: resistance = $document.system.resistance[key];

   async function rollResistance(resistance) {
      const getOptions = game.settings.get("titan", "getCheckOptions") == true || event.shiftKey;

      $document.rollResistanceCheck({
         resistance: resistance,
         getOptions: getOptions,
      });
   }
</script>

<div class="resistance" data-resistance={key}>
   <!--Resistance Label-->
   <div class="button {key}" data-titan-tooltip={localize(`LOCAL.${key}.desc.label`)}>
      <EfxButton on:click={rollResistance(key)} efx={ripple()}>
         {localize(`LOCAL.${key}.label`)}
      </EfxButton>
   </div>

   <div class="stats">
      <!--Base Value-->
      <div class="label" data-titan-tooltip={localize(`LOCAL.${key}.baseValue.label`)}>
         {resistance.baseValue}
      </div>
      <div class="label">+</div>

      <!--Static Mod-->
      <div class="input" data-titan-tooltip={localize(`LOCAL.${key}.editStaticMod.label`)}>
         <DocumentIntegerInput bind:value={$document.system.resistance[key].staticMod} />
      </div>
      <div class="label">=</div>

      <!--Total Value-->
      <div class="label final" data-titan-tooltip={localize(`LOCAL.${key}.value.label`)}>
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
      box-sizing: border-box;
      font-size: 1rem;

      .button {
         width: 6rem;

         &.reflexes {
            --color-background-button-normal: var(--color-reflexes-bright);
         }

         &.resilience {
            --color-background-button-normal: var(--color-resilience-bright);
         }

         &.willpower {
            --color-background-button-normal: var(--color-willpower-bright);
         }
      }

      .stats {
         @include flex-row;
         @include flex-group-center;
         height: 100%;
         margin-left: 1rem;

         :not(:first-child) {
            margin-left: 0.5rem;
         }

         .input {
            @include flex-row;
            @include flex-group-center;
            height: 100%;
            height: 100%;
            width: 1.7rem;
            --border-radius-input: 10px;
         }

         .label {
            @include flex-row;
            @include flex-group-center;
            height: 100%;
            font-size: 1rem;

            &.final {
               font-weight: bold;
               width: 1rem;
            }
         }
      }
   }
</style>
