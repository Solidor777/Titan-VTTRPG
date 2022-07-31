<svelte:options accessors={true} />

<script>
   import { setContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import ResistanceSelect from "../components/ResistanceSelect.svelte";
   import CheckDifficultySelect from "../../components/CheckDifficultySelect.svelte";
   import IntegerInput from "../../../helpers/svelte-components/IntegerInput.svelte";

   // The actor document making this check
   export let storeDoc = void 0;

   // Initial check options
   export let inData = void 0;

   let checkParameters = {
      resistance: inData.resistance ? inData.resistance : "reflexes",
      difficulty: inData.difficulty ? inData.difficulty : 4,
      complexity: inData.complexity ? inData.complexity : 0,
      diceMod: inData.diceMod ? inData.diceMod : 0,
   };

   // Setup context and store
   setContext("DialogObject", storeDoc);
</script>

<div class="resistance-check-dialog">
   <!--Resistance-->
   <div class="field">
      <div class="label">
         {localize("LOCAL.resistance.label")}
      </div>
      <div class="input">
         <ResistanceSelect bind:value={checkParameters.resistance} />
      </div>
   </div>

   <div class="row">
      <!--Difficulty-->
      <div class="field">
         <div class="label">
            {localize("LOCAL.difficulty.label")}
         </div>
         <div class="input">
            <CheckDifficultySelect bind:difficulty={checkParameters.difficulty} />
         </div>
      </div>

      <!--Complexity-->
      <div class="field">
         <div class="label">
            {localize("LOCAL.complexity.label")}
         </div>
         <div class="input">
            <IntegerInput bind:value={checkParameters.complexity} positive={true} />
         </div>
      </div>

      <!--Dice Mod-->
      <div class="field">
         <div class="label">
            {localize("LOCAL.bonusPenaltyDice.label")}
         </div>
         <div class="input">
            <IntegerInput bind:value={checkParameters.diceMod} />
         </div>
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../../styles/Mixins.scss";

   .resistance-check-dialog {
      @include flex-column;
      justify-items: flex-end;

      .row {
         @include flex-row;
         justify-content: flex-start;
         align-items: flex-end;

         height: 100%;
         width: 100%;

         &:not(:first-child) {
            margin-top: 0.5rem;
         }
      }

      .field {
         @include flex-column;
         height: 100%;
         &:not(:first-child) {
            margin-left: 0.5rem;
         }

         .label {
            font-weight: bold;
            height: 100;
         }

         .input {
            --height-input: 1.8rem;
         }
      }
   }
</style>
