<script>
   import CheckDialogAttributeField from '~/check/dialog/CheckDialogAttributeField.svelte';
   import CheckDialogBase from '~/check/dialog/CheckDialogBase.svelte';
   import CheckDialogComplexityField from '~/check/dialog/CheckDialogComplexityField.svelte';
   import CheckDialogDamageModField from '~/check/dialog/CheckDialogDamageModField.svelte';
   import CheckDialogDiceModField from '~/check/dialog/CheckDialogDiceModField.svelte';
   import CheckDialogDifficultyField from '~/check/dialog/CheckDialogDifficultyField.svelte';
   import CheckDialogDoubleExpertiseField from '~/check/dialog/CheckDialogDoubleExpertiseField.svelte';
   import CheckDialogDoubleTrainingField from '~/check/dialog/CheckDialogDoubleTrainingField.svelte';
   import CheckDialogExpertiseModField from '~/check/dialog/CheckDialogExpertiseModField.svelte';
   import CheckDialogHealingModField from '~/check/dialog/CheckDialogHealingModField.svelte';
   import CheckDialogSkillField from '~/check/dialog/CheckDialogSkillField.svelte';
   import CheckDialogTotalDiceSummary from '~/check/dialog/CheckDialogTotalDiceSummary.svelte';
   import CheckDialogTotalExpertiseSummary from '~/check/dialog/CheckDialogTotalExpertiseSummary.svelte';
   import CheckDialogTrainingModField from '~/check/dialog/CheckDialogTrainingModField.svelte';
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {getContext} from 'svelte';

   /** @type TitanActor The Actor that will roll the Check. */
   export let actor = void 0;

   /** @type object Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   /** @type object Reference to calculated Check Parameters Store. */
   const checkParameters = getContext('checkParameters');

   /** @type CastingCheckDialog The Svelte Component's Application. */
   const application = getApplication();

   /** @type {*[]} Base template for the svelte-components rows. */
   const baseRows = [
      CheckDialogAttributeField,
      CheckDialogSkillField,
      CheckDialogDifficultyField,
      CheckDialogComplexityField,
      CheckDialogDiceModField,
      CheckDialogTrainingModField,
      CheckDialogExpertiseModField,
      CheckDialogDoubleTrainingField,
      CheckDialogDoubleExpertiseField,
      CheckDialogTotalDiceSummary,
      CheckDialogTotalExpertiseSummary,
   ];

   /** @type {*[]} Components for changing the options and displaying the parameters. */
   let rows = baseRows;

   /** @type Function Called when the check becomes invalid. */
   function onCheckInvalid() {
      ui.notifications.info(localize('castingCheckNoLongerValid'));
      game.titan.warn(
         localize('castingCheckNoLongerValid'),
         true,
         checkOptions,
         actor,
      );
      application.close();
   }

   /** @type Function Called when the Roll button is clicked. */
   function onRoll() {
      if (actor?.system.validateCastingCheckOptions($checkOptions)) {
         actor.system.rollCastingCheck($checkOptions);
      }
      else {
         onCheckInvalid();
      }
   }

   // Update the parameters whenever the check options are displayed
   $: {
      if (actor?.system.validateCastingCheckOptions($checkOptions)) {
         $checkParameters = actor.system.getCastingCheckParameters($checkOptions);
      }
      else {
         onCheckInvalid();
      }
   }

   // Update whether Damage and Healing mod fields are display
   $: {
      // Reset the rows
      rows = baseRows;

      // Add healing mod
      if ($checkParameters.healing) {
         rows.splice(4, 0, CheckDialogHealingModField);
      }

      // Add damage mod
      if ($checkParameters.damage) {
         rows.splice(4, 0, CheckDialogDamageModField);
      }
   }

</script>

<CheckDialogBase on:roll={onRoll} {rows}/>
