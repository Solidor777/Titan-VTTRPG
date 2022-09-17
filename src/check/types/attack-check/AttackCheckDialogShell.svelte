<svelte:options accessors={true} />

<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";
   import AttributeSelect from "~/helpers/svelte-components/select/AttributeSelect.svelte";
   import SkillSelect from "~/helpers/svelte-components/select/SkillSelect.svelte";
   import IntegerInput from "~/helpers/svelte-components/input/IntegerInput.svelte";
   import IntegerSelect from "~/helpers/svelte-components/select/IntegerSelect.svelte";
   import Select from "~/helpers/svelte-components/select/Select.svelte";

   // The actor document making this check
   export let actor;

   // Initial check options
   export let options = void 0;

   // Weapon
   const weapon = actor.items.get(options.itemId);

   // Attack
   const attack = weapon.system.attack[options.attackIdx];

   // Initialize check parameters
   let checkParameters = {
      attribute: options.attribute ?? attack.attribute,
      skill: options.skill ?? attack.skill,
      type: options.type ?? "melee",
      targetDefense: options.targetDefense ?? 1,
      attackerMelee: options.attackerMelee ?? actor.system.rating.melee.value,
      attackerAccuracy: options.attackerAccuracy ?? actor.system.rating.accuracy.value,
      damageMod: options.damageMod ?? 0,
      trainingMod: options.trainingMod ?? 0,
      doubleTraining: options.doubleTraining ?? false,
      expertiseMod: options.expertiseMod ?? 0,
      doubleExpertise: options.doubleExpertise ?? false,
      diceMod: options.diceMod ?? 0,
      itemId: options.itemId,
      attackIdx: options.attackIdx,
   };

   // Rating options
   const ratingOptions = [1, 2, 3, 4, 5, 6];

   // Type Options
   const typeOptions = [
      {
         value: "melee",
         label: localize("melee"),
      },
      {
         value: "ranged",
         label: localize("ranged"),
      },
   ];

   const application = getContext("external").application;

   async function onRoll() {
      await actor.typeComponent.rollAttackCheck(checkParameters);
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
   <!--Name-->
   <div class="row row-label">
      {options.weaponName} ({options.attackName})
   </div>

   <!--Attribute-->
   <div class="row">
      <div class="label">
         {localize("attribute")}
      </div>
      <div class="input">
         <AttributeSelect bind:value={checkParameters.attribute} />
      </div>
   </div>

   <!--Skill-->
   <div class="row">
      <div class="label">
         {localize("skill")}
      </div>
      <div class="input">
         <SkillSelect bind:value={checkParameters.skill} />
      </div>
   </div>

   <!--Type-->
   <div class="row">
      <div class="label">
         {localize("type")}
      </div>
      <div class="input">
         <Select options={typeOptions} bind:value={checkParameters.type} />
      </div>
   </div>

   <!--Attacker ratings-->
   <div class="row">
      {#if checkParameters.type === "melee"}
         <!--Melee-->
         <div class="label">
            {localize("attackerMelee")}
         </div>
         <div class="input">
            <IntegerSelect options={ratingOptions} bind:value={checkParameters.attackerMelee} />
         </div>
      {:else}
         <!--Accuracy-->
         <div class="label">
            {localize("attackerAccuracy")}
         </div>
         <div class="input">
            <IntegerSelect options={ratingOptions} bind:value={checkParameters.attackerAccuracy} />
         </div>
      {/if}
   </div>

   <!--Defense rating-->
   <div class="row">
      <div class="label">
         {localize("targetDefense")}
      </div>
      <div class="input">
         <IntegerSelect options={ratingOptions} bind:value={checkParameters.targetDefense} />
      </div>
   </div>

   <!--Dice Mod-->
   <div class="row">
      <div class="label">
         {localize("bonusPenaltyDice")}
      </div>
      <div class="input">
         <IntegerInput bind:value={checkParameters.diceMod} />
      </div>
   </div>

   <!--Training Mod-->
   <div class="row">
      <div class="label">
         {localize("trainingMod")}
      </div>
      <div class="input">
         <IntegerInput bind:value={checkParameters.trainingMod} />
      </div>
   </div>

   <!--Expertise Mod-->
   <div class="row">
      <div class="label">
         {localize("expertiseMod")}
      </div>
      <div class="input">
         <IntegerInput bind:value={checkParameters.expertiseMod} />
      </div>
   </div>

   <!--Double Training-->
   <div class="row">
      <div class="label">
         {localize("doubleTraining")}
      </div>
      <div class="input">
         <input type="checkbox" bind:checked={checkParameters.doubleTraining} />
      </div>
   </div>

   <!--Double Expertise-->
   <div class="row">
      <div class="label">
         {localize("doubleExpertise")}
      </div>
      <div class="input">
         <input type="checkbox" bind:checked={checkParameters.doubleExpertise} />
      </div>
   </div>

   <!--Summary-->
   <div class="row">
      <!--Total Dice-->
      <div class="summary">
         {localize("totalDice") + ": "}
         {totalDice}
      </div>

      <!--Total Expertise-->
      <div class="summary">
         {localize("totalExpertise") + ": "}
         {totalExpertise}
      </div>
   </div>

   <!--Buttons-->
   <div class="row">
      <button on:click={onRoll}>{localize("roll")}</button>
      <button on:click={onCancel}>{localize("cancel")}</button>
   </div>
</div>

<style lang="scss">
   @import "../../../styles/Mixins.scss";

   .skill-check-dialog {
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
            margin-top: 0.5rem;
            font-weight: bold;
            font-size: 1.1rem;
            height: 100%;
            width: 100%;
            margin-right: 0.5rem;
         }

         button {
            margin-top: 0.5rem;
            font-size: 1rem;
         }
      }

      .row-label {
         @include flex-group-center;
         flex-wrap: wrap;
         font-weight: bold;
         height: 100%;
         width: 100%;
      }
   }
</style>
