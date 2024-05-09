<script>
   import CheckDialogBase from '~/check/dialog/CheckDialogBase.svelte';
   import { getContext } from 'svelte';
   import CheckDialogComplexityField from '~/check/dialog/CheckDialogComplexityField.svelte';
   import CheckDialogDifficultyField from '~/check/dialog/CheckDialogDifficultyField.svelte';
   import CheckDialogDiceModField from '~/check/dialog/CheckDialogDiceModField.svelte';
   import CheckDialogExpertiseModField from '~/check/dialog/CheckDialogExpertiseModField.svelte';
   import CheckDialogDoubleExpertiseField from '~/check/dialog/CheckDialogDoubleExpertiseField.svelte';
   import CheckDialogTotalDiceSummary from '~/check/dialog/CheckDialogTotalDiceSummary.svelte';
   import CheckDialogTotalExpertiseSummary from '~/check/dialog/CheckDialogTotalExpertiseSummary.svelte';
   import CheckDialogResistanceField
      from '~/check/types/resistance-check/dialog/ResistanceCheckDialogResistanceField.svelte';
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import localize from '~/helpers/utility-functions/Localize.js';

   /** @type TitanActor The Actor that will roll the Check. */
   export let actor = void 0;

   /** @type {ResistanceCheckOptions}   Reference to the Check Options. */
   const checkOptions = getContext('checkOptions');

   /** @type {ResistanceCheckParameters}   Reference to calculated Check Parameters. */
   const checkParameters = getContext('checkParameters');

   /** @type {Application} Reference to the dialog application. */
   const application = getApplication();

   /** @type {*[]} Components for changing the options and displaying the parameters. */
   const rows = [
      CheckDialogResistanceField,
      CheckDialogDifficultyField,
      CheckDialogComplexityField,
      CheckDialogDiceModField,
      CheckDialogExpertiseModField,
      CheckDialogDoubleExpertiseField,
      CheckDialogTotalDiceSummary,
      CheckDialogTotalExpertiseSummary,
   ];

   /** @type Function Called when the check becomes invalid. */
   function onCheckInvalid() {
      ui.notifications.info(localize('resistanceCheckNoLongerValid'));
      game.titan.warn(
         localize('resistanceCheckNoLongerValid'),
         true,
         checkOptions,
         actor,
      );
      application.close();
   }

   /** @type Function Called when the Roll button is clicked. */
   function onRoll() {
      if (actor?.system.validateResistanceCheckOptions($checkOptions)) {
         actor.system.rollResistanceCheck($checkOptions);
      }
      else {
         onCheckInvalid();
      }
   }

   // Update the parameters whenever the check options are displayed
   $: {
      if (actor?.system.validateResistanceCheckOptions($checkOptions)) {
         $checkParameters = actor.system.getResistanceCheckParameters($checkOptions);
      }
      else {
         onCheckInvalid();
      }
   }

</script>

<CheckDialogBase {rows} on:roll={onRoll}/>
