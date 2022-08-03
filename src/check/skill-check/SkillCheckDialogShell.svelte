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
      expertiseMod: options.expertiseMod ? options.expertiseMod : 0,
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

   function getTotalDice(checkParameters, actor) {
      let retVal = actor.system.attribute[checkParameters.attribute].value + checkParameters.diceMod;
      if (checkParameters.skill !== "none") {
         retVal += actor.system.skill[checkParameters.skill].training.value;
         retVal += checkParameters.trainingMod;
      }

      return retVal;
   }

   $: totalDice = getTotalDice(checkParameters, actor);
</script>

<div class="skill-check-dialog">
   <div class="row">
      <!--Attribute-->
      <div class="field">
         <div class="label">
            {localize("LOCAL.skill.label")}
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

   <!--Total Dice-->
   <div class="row">
      <div class="total-dice">
         {localize("LOCAL.totalDice.label") + ": "}
         {totalDice}
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

      .row {
         @include flex-row;
         justify-content: center;
         align-items: flex-end;

         height: 100%;
         width: 100%;

         &:not(:first-child) {
            margin-top: 0.5rem;
            @include border-top-normal;
            padding-top: 0.25rem;
         }
      }

      .field {
         @include flex-column;
         @include flex-group-center;
         height: 100%;
         &:not(:first-child) {
            margin-left: 0.5rem;
         }

         .label {
            font-weight: bold;
            height: 100;
         }

         .input {
            width: 100%;
            margin-top: 0.25rem;
            --height-input: 1.8rem;
         }
      }

      .total-dice {
         font-weight: bold;
         font-size: 1rem;
      }
   }
</style>
