<svelte:options accessors={true} />

<script>
   import { localize } from '~/helpers/Utility.js';
   import { getContext } from 'svelte';
   import ResistanceSelect from '~/helpers/svelte-components/select/ResistanceSelect.svelte';
   import CheckDifficultySelect from '~/helpers/svelte-components/select/CheckDifficultySelect.svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';

   // The actor document making this check
   export let actor;

   // Initial check options
   export let options = void 0;

   // Initialize check parameters
   const checkParameters = {
      complexity: options.complexity ? Math.max(options.complexity, 0) : 0,
      diceMod: options.diceMod ?? 0,
      difficulty: options.difficulty ? clamp(options.difficulty, 2, 6) : 4,
      resistance: options.resistance ?? 'reflexes',
   };

   const application = getContext('#external').application;

   async function onRoll() {
      actor.typeComponent.rollResistanceCheck(checkParameters, true);
      application.close();
      return;
   }

   async function onCancel() {
      application.close();
      return;
   }
</script>

<div class="check-dialog">
   <div class="row">
      <!--Resistance-->
      <div class="row">
         <div class="label">
            {localize('resistance')}
         </div>
         <div class="input">
            <ResistanceSelect bind:value={checkParameters.resistance} />
         </div>
      </div>
   </div>

   <!--Difficulty-->
   <div class="row">
      <div class="label">
         {localize('difficulty')}
      </div>
      <div class="input">
         <CheckDifficultySelect bind:value={checkParameters.difficulty} />
      </div>
   </div>

   <!--Complexity-->
   <div class="row">
      <div class="label">
         {localize('complexity')}
      </div>
      <div class="input">
         <IntegerInput bind:value={checkParameters.complexity} min={0} />
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

   <!--Total Dice-->
   <div class="row">
      <div class="summary">
         {localize('totalDice') + ': '}
         {actor.system.resistance[checkParameters.resistance].value +
            checkParameters.diceMod}
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
         }
      }
   }
</style>
