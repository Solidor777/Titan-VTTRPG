<svelte:options accessors={true} />

<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { getContext } from "svelte";
   import ResistanceSelect from "~/helpers/svelte-components/ResistanceSelect.svelte";
   import CheckDifficultySelect from "~/check/components/CheckDifficultySelect.svelte";
   import IntegerInput from "~/helpers/svelte-components/IntegerInput.svelte";

   // The actor document making this check
   export let actor;

   // Initial check options
   export let options = void 0;

   // Initialize check parameters
   let checkParameters = {
      resistance: options.resistance ? options.resistance : "reflexes",
      difficulty: options.difficulty ? options.difficulty : 4,
      complexity: options.complexity ? options.complexity : 0,
      diceMod: options.diceMod ? options.diceMod : 0,
   };

   const application = getContext("external").application;

   async function onRoll() {
      await actor.rollResistanceCheck(checkParameters);
      application.close();
      return;
   }

   async function onCancel() {
      application.close();
      return;
   }
</script>

<div class="resistance-check-dialog">
   <div class="row">
      <!--Resistance-->
      <div class="row">
         <div class="label">
            {localize("LOCAL.resistance.label")}
         </div>
         <div class="input">
            <ResistanceSelect bind:value={checkParameters.resistance} />
         </div>
      </div>
   </div>

   <!--Difficulty-->
   <div class="row">
      <div class="label">
         {localize("LOCAL.difficulty.label")}
      </div>
      <div class="input">
         <CheckDifficultySelect bind:difficulty={checkParameters.difficulty} />
      </div>
   </div>

   <!--Complexity-->
   <div class="row">
      <div class="label">
         {localize("LOCAL.complexity.label")}
      </div>
      <div class="input">
         <IntegerInput bind:value={checkParameters.complexity} positive={true} />
      </div>
   </div>

   <!--Dice Mod-->
   <div class="row">
      <div class="label">
         {localize("LOCAL.bonusPenaltyDice.label")}
      </div>
      <div class="input">
         <IntegerInput bind:value={checkParameters.diceMod} />
      </div>
   </div>

   <!--Total Dice-->
   <div class="row">
      <div class="summary">
         {localize("LOCAL.totalDice.label") + ": "}
         {actor.system.resistance[checkParameters.resistance].value + checkParameters.diceMod}
      </div>
   </div>

   <!--Buttons-->
   <div class="row">
      <button on:click={onRoll}>{localize("LOCAL.roll.label")}</button>
      <button on:click={onCancel}>{localize("LOCAL.cancel.label")}</button>
   </div>
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   .resistance-check-dialog {
      @include flex-column;
      justify-items: flex-end;
      font-size: 1rem;

      .row {
         @include flex-row;
         @include flex-group-center;
         height: 100%;
         width: 100%;

         &:not(:first-child) {
            border-top: solid;
            padding-top: 0.25rem;
            margin-top: 0.25rem;
            border-width: var(--border-width);
         }

         .label {
            @include flex-group-right;
            font-weight: bold;
            height: 100%;
            width: 100%;
            margin-right: 0.5rem;
         }

         .input {
            @include flex-group-center;
            margin-left: 0.5rem;
            height: 100%;
            width: 100%;
            --input-height: 1.8rem;
            --input-width: 100%;
         }

         .summary {
            @include flex-group-center;
            font-weight: bold;
            font-size: 1.1rem;
            height: 100%;
            width: 100%;
            margin-right: 0.5rem;
         }

         button {
            font-size: 1rem;
         }
      }
   }
</style>
