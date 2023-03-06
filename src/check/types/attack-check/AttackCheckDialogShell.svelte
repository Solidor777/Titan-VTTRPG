<svelte:options accessors={true} />

<script>
   import { localize, getCombatTargets } from '~/helpers/Utility.js';
   import { getContext } from 'svelte';
   import AttributeSelect from '~/helpers/svelte-components/select/AttributeSelect.svelte';
   import SkillSelect from '~/helpers/svelte-components/select/SkillSelect.svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
   import Select from '~/helpers/svelte-components/select/Select.svelte';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';
   import CheckboxInput from '~/helpers/svelte-components/input/CheckboxInput.svelte';

   // The actor document making this check
   export let actor;

   // Initial check options
   export let options = void 0;

   // Weapon
   export let weapon = void 0;

   // Attack
   export let attack = void 0;

   // Get the target defense
   function getTargetDefense() {
      const userTargets = getCombatTargets();

      if (userTargets[0] && userTargets[0]._id !== actor._id) {
         return userTargets[0].getRollData().rating.defense.value;
      }

      return 1;
   }

   // Initialize check parameters
   const multiAttack = options.multiAttack ?? weapon.system.multiAttack;
   const checkParameters = {
      attackIdx: options.attackIdx,
      attackerAccuracy:
         options.attackerAccuracy ??
         actor.system.rating.accuracy.value +
            actor.typeComponent.getAttackRatingModifier(
               'accuracy',
               weapon,
               attack,
               multiAttack
            ),
      attackerMelee:
         options.attackerMelee ??
         actor.system.rating.melee.value +
            actor.typeComponent.getAttackRatingModifier(
               'melee',
               weapon,
               attack,
               multiAttack
            ),
      attribute: options.attribute ?? attack.attribute,
      diceMod:
         options.diceMod ??
         actor.character.getAttackCheckDiceMod(weapon, attack, multiAttack),
      doubleExpertise: options.doubleExpertise ?? false,
      doubleTraining: options.doubleTraining ?? false,
      expertiseMod: options.expertiseMod ?? 0,
      itemId: options.itemId,
      multiAttack: multiAttack,
      skill: options.skill ?? attack.skill,
      targetDefense: options.targetDefense ?? getTargetDefense(),
      trainingMod: options.trainingMod ?? 0,
      type: options.type ?? attack.type,
   };

   // Type Options
   const typeOptions = [
      {
         value: 'melee',
         label: localize('melee'),
      },
      {
         value: 'ranged',
         label: localize('ranged'),
      },
   ];

   const application = getContext('#external').application;

   async function onRoll() {
      actor.typeComponent.rollAttackCheck(checkParameters, true);
      application.close();
      return;
   }

   async function onCancel() {
      application.close();
      return;
   }

   // Determine whether this attack has the flurry trait
   function hasFlurryTrait() {
      for (let idx = 0; idx < attack.trait.length; idx++) {
         if (attack.trait[idx].name === 'flurry') {
            return true;
         }
      }

      return false;
   }

   let flurryTrait = hasFlurryTrait();

   // Calculates the total dice
   function getTotalDice(checkParameters, actor) {
      // Get the attribute dice
      let retVal =
         actor.system.attribute[checkParameters.attribute].value +
         checkParameters.diceMod;

      // If there is a skill set
      if (checkParameters.skill !== 'none') {
         // Get the training dice
         let trainingDice =
            actor.system.skill[checkParameters.skill].training.value;
         trainingDice += checkParameters.trainingMod;

         // Double training if appropriate
         if (checkParameters.doubleTraining === true) {
            trainingDice *= 2;
         }
         retVal += trainingDice;
      }

      // Halve dice if using multi attack
      if (checkParameters.multiAttack) {
         // Round the total dice up if this is a dual attack
         // Otherwise, round down
         retVal = flurryTrait ? Math.ceil(retVal / 2) : Math.floor(retVal / 2);
      }

      return retVal;
   }

   // Calculates the total expertise
   function getTotalExpertise(checkParameters, actor) {
      let retVal = 0;

      // If there is a skill set
      if (checkParameters.skill !== 'none') {
         // Get the training expertise
         retVal += actor.system.skill[checkParameters.skill].expertise.value;
         retVal += checkParameters.expertiseMod;

         // Double training if appropriate
         if (checkParameters.doubleExpertise === true) {
            retVal *= 2;
         }
      }

      // Halve expertise if using multi attack
      if (checkParameters.multiAttack) {
         retVal = Math.floor(retVal / 2);
      }

      return retVal;
   }

   $: totalDice = getTotalDice(checkParameters, actor);
   $: totalExpertise = getTotalExpertise(checkParameters, actor);
</script>

<div class="check-dialog">
   <!--Name-->
   <div class="row row-label">
      {weapon.name} ({attack.label})
   </div>

   <!--Attribute-->
   <div class="row">
      <div class="label">
         {localize('attribute')}
      </div>
      <div class="input">
         <AttributeSelect bind:value={checkParameters.attribute} />
      </div>
   </div>

   <!--Skill-->
   <div class="row">
      <div class="label">
         {localize('skill')}
      </div>
      <div class="input">
         <SkillSelect bind:value={checkParameters.skill} />
      </div>
   </div>

   <!--Type-->
   <div class="row">
      <div class="label">
         {localize('type')}
      </div>
      <div class="input">
         <Select options={typeOptions} bind:value={checkParameters.type} />
      </div>
   </div>

   <!--Attacker ratings-->
   <div class="row">
      {#if checkParameters.type === 'melee'}
         <!--Melee-->
         <div class="label">
            {localize('attackerMelee')}
         </div>
         <div class="input">
            <IntegerInput bind:value={checkParameters.attackerMelee} />
         </div>
      {:else}
         <!--Accuracy-->
         <div class="label">
            {localize('attackerAccuracy')}
         </div>
         <div class="input">
            <IntegerInput bind:value={checkParameters.attackerAccuracy} />
         </div>
      {/if}
   </div>

   <!--Defense rating-->
   <div class="row">
      <div class="label">
         {localize('targetDefense')}
      </div>
      <div class="input">
         <IntegerInput bind:value={checkParameters.targetDefense} />
      </div>
   </div>

   <!--MultiAttack Training-->
   <div class="row">
      <div class="label">
         {localize('multiAttack')}
      </div>
      <div class="input">
         <CheckboxInput bind:value={checkParameters.multiAttack} />
      </div>
   </div>

   <!--Dice Mod-->
   <div class="row">
      <div class="label">
         {localize('bonusPenaltyDice')}
      </div>
      <div class="input">
         <IntegerInput bind:value={checkParameters.diceMod} />
      </div>
   </div>

   <!--Training Mod-->
   <div class="row">
      <div class="label">
         {localize('trainingMod')}
      </div>
      <div class="input">
         <IntegerInput bind:value={checkParameters.trainingMod} />
      </div>
   </div>

   <!--Expertise Mod-->
   <div class="row">
      <div class="label">
         {localize('expertiseMod')}
      </div>
      <div class="input">
         <IntegerInput bind:value={checkParameters.expertiseMod} />
      </div>
   </div>

   <!--Double Training-->
   <div class="row">
      <div class="label">
         {localize('doubleTraining')}
      </div>
      <div class="input">
         <CheckboxInput bind:value={checkParameters.doubleTraining} />
      </div>
   </div>

   <!--Double Expertise-->
   <div class="row">
      <div class="label">
         {localize('doubleExpertise')}
      </div>
      <div class="input">
         <CheckboxInput bind:value={checkParameters.doubleExpertise} />
      </div>
   </div>

   <!--Summary-->
   <div class="row">
      <!--Total Dice-->
      <div class="summary">
         {localize('totalDice') + ': '}
         {totalDice}
      </div>

      <!--Total Expertise-->
      <div class="summary">
         {localize('totalExpertise') + ': '}
         {totalExpertise}
      </div>
   </div>

   <!--Buttons-->
   <div class="row">
      <div class="button">
         <EfxButton on:click={onRoll}>{localize('roll')}</EfxButton>
      </div>

      <div class="button">
         <EfxButton on:click={onCancel}>{localize('cancel')}</EfxButton>
      </div>
   </div>
</div>

<style lang="scss">
   @import '../../../styles/Mixins.scss';

   .check-dialog {
      @include flex-column;
      justify-items: flex-end;
      @include font-size-normal;

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
            @include font-size-normal;
            height: 100%;
            width: 100%;
            margin-right: 0.5rem;
         }

         .button {
            @include flex-row;
            width: 100%;
            margin-top: 0.5rem;

            &:not(:first-child) {
               margin-left: 0.25rem;
            }
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
