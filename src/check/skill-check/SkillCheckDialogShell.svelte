<svelte:options accessors={true} />

<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { getContext } from "svelte";
   import AttributeSelect from "~/helpers/svelte-components/AttributeSelect.svelte";
   import SkillSelect from "~/helpers/svelte-components/SkillSelect.svelte";
   import CheckDifficultySelect from "~/check/components/CheckDifficultySelect.svelte";
   import IntegerInput from "~/helpers/svelte-components/IntegerInput.svelte";

   // The actor document making this check
   export let actor;

   // Initial check options
   export let options = void 0;

   // Initialize check parameters
   let checkParameters = {
      attribute: options.attribute ? options.attribute : "body",
      skill: options.skill ? options.skill : "athletics",
      difficulty: options.difficulty ? options.difficulty : 4,
      complexity: options.complexity ? options.complexity : 0,
      trainingMod: options.trainingMod ? options.trainingMod : 0,
      doubleTraining: options.doubleTraining ? options.doubleTraining : false,
      expertiseMod: options.expertiseMod ? options.expertiseMod : 0,
      doubleExpertise: options.doubleExpertise ? options.doubleExpertise : false,
      diceMod: options.diceMod ? options.diceMod : 0,
   };

   const application = getContext("external").application;

   async function onRoll() {
      await actor.rollAttributeCheck(checkParameters);
      application.close();
      return;
   }

   async function onCancel() {
      application.close();
      return;
   }

   // Calculates the total dice
   function getTotalDice(checkParameters, actor) {
      // Get the attribute dice
      let retVal = actor.system.attribute[checkParameters.attribute].value + checkParameters.diceMod;

      // If there is a skill set
      if (checkParameters.skill !== "none") {
         // Get the training dice
         let trainingDice = actor.system.skill[checkParameters.skill].training.value;
         trainingDice += checkParameters.trainingMod;

         // Double training if appropriate
         if (checkParameters.doubleTraining === true) {
            trainingDice *= 2;
         }
         retVal += trainingDice;
      }

      return retVal;
   }

   // Calculates the total expertise
   function getTotalExpertise(checkParameters, actor) {
      let retVal = 0;

      // If there is a skill set
      if (checkParameters.skill !== "none") {
         // Get the training expertise
         retVal += actor.system.skill[checkParameters.skill].expertise.value;
         retVal += checkParameters.expertiseMod;

         // Double training if appropriate
         if (checkParameters.doubleExpertise === true) {
            retVal *= 2;
         }
      }

      return retVal;
   }

   $: totalDice = getTotalDice(checkParameters, actor);
   $: totalExpertise = getTotalExpertise(checkParameters, actor);
</script>

<div class="skill-check-dialog">
   <!--Attribute-->
   <div class="field">
      <div class="label">
         {localize("LOCAL.attribute.label")}
      </div>
      <div class="input">
         <AttributeSelect bind:value={checkParameters.attribute} />
      </div>
   </div>
   <!--Skill-->
   <div class="field">
      <div class="label">
         {localize("LOCAL.skill.label")}
      </div>
      <div class="input">
         <SkillSelect bind:value={checkParameters.skill} />
      </div>
   </div>

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

   <!--Training Mod-->
   <div class="field">
      <div class="label">
         {localize("LOCAL.trainingMod.label")}
      </div>
      <div class="input">
         <IntegerInput bind:value={checkParameters.trainingMod} />
      </div>
   </div>

   <!--Expertise Mod-->
   <div class="field">
      <div class="label">
         {localize("LOCAL.expertiseMod.label")}
      </div>
      <div class="input">
         <IntegerInput bind:value={checkParameters.expertiseMod} />
      </div>
   </div>

   <!--Double Training-->
   <div class="field">
      <div class="label">
         {localize("LOCAL.doubleTraining.label")}
      </div>
      <div class="input">
         <input type="checkbox" bind:checked={checkParameters.doubleTraining} />
      </div>
   </div>

   <!--Double Expertise-->
   <div class="field">
      <div class="label">
         {localize("LOCAL.doubleExpertise.label")}
      </div>
      <div class="input">
         <input type="checkbox" bind:checked={checkParameters.doubleExpertise} />
      </div>
   </div>

   <!--Summary-->
   <div class="row">
      <!--Total Dice-->
      <div class="label">
         {localize("LOCAL.totalDice.label") + ": "}
         {totalDice}
      </div>

      <!--Total Expertise-->
      <div class="label">
         {localize("LOCAL.totalExpertise.label") + ": "}
         {totalExpertise}
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

   .skill-check-dialog {
      @include flex-column;
      justify-items: flex-end;
      font-size: 1rem;

      .field {
         @include flex-row;
         @include flex-group-center;
         height: 100%;
         width: 100%;

         &:not(:first-child) {
            border-top: solid;
            padding-top: 0.25rem;
            margin-top: 0.25rem;
            border-width: var(--border-width-normal);
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
            --height-input: 1.8rem;
            --width-input: 100%;
         }
      }

      .row {
         @include flex-row;
         @include flex-group-center;
         @include border-top-normal;
         margin-top: 0.25rem;
         padding-top: 0.25rem;
         height: 100%;
         width: 100%;
         font-size: 1rem;

         .label {
            @include flex-group-center;
            font-weight: bold;
            height: 100%;
            width: 100%;
            margin-right: 0.5rem;
         }

         button {
            font-size: 1rem;
         }
      }

      .summary {
         font-weight: bold;
         font-size: 1.1rem;
      }
   }
</style>
