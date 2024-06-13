<script>
   import CheckDialogAttributeField from '~/check/dialog/CheckDialogAttributeField.svelte';
   import CheckDialogBase from '~/check/dialog/CheckDialogBase.svelte';
   import CheckDialogComplexityField from '~/check/dialog/CheckDialogComplexityField.svelte';
   import CheckDialogDiceModField from '~/check/dialog/CheckDialogDiceModField.svelte';
   import CheckDialogDifficultyField from '~/check/dialog/CheckDialogDifficultyField.svelte';
   import CheckDialogDoubleExpertiseField from '~/check/dialog/CheckDialogDoubleExpertiseField.svelte';
   import CheckDialogDoubleTrainingField from '~/check/dialog/CheckDialogDoubleTrainingField.svelte';
   import CheckDialogExpertiseModField from '~/check/dialog/CheckDialogExpertiseModField.svelte';
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

   /** @type object Reference to calculated Check Parameters. */
   const checkParameters = getContext('checkParameters');

   /** @type ItemCheckDialog The Svelte Component's Application. */
   const application = getApplication();

   /** @type {*[]} Components for changing the options and displaying the parameters. */
   const rows = [
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

   /** @type Function Called when the check becomes invalid. */
   function onCheckInvalid() {
      ui.notifications.info(localize('itemCheckNoLongerValid'));
      game.titan.warn(
         localize('itemCheckNoLongerValid'),
         true,
         checkOptions,
         actor,
      );
      application.close();
   }

   /** @type Function Called when the Roll button is clicked. */
   function onRoll() {
      if (actor?.system.validateItemCheckOptions($checkOptions)) {
         actor.system.rollItemCheck($checkOptions);
      }
      else {
         onCheckInvalid();
      }
   }

   // Update the parameters whenever the check options are displayed
   $: {
      if (actor?.system.validateItemCheckOptions($checkOptions)) {
         $checkParameters = actor.system.getItemCheckParameters($checkOptions);
      }
      else {
         onCheckInvalid();
      }
   }

</script>

<CheckDialogBase on:roll={onRoll} {rows}/>
