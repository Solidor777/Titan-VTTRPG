<script>
   import CheckDialogAdvantageField from '~/check/dialog/CheckDialogAdvantageField.svelte';
   import CheckDialogAttributeField from '~/check/dialog/CheckDialogAttributeField.svelte';
   import CheckDialogAutomaticFailureField from '~/check/dialog/CheckDialogAutomaticFailureField.svelte';
   import CheckDialogBase from '~/check/dialog/CheckDialogBase.svelte';
   import CheckDialogComplexityField from '~/check/dialog/CheckDialogComplexityField.svelte';
   import CheckDialogDiceModField from '~/check/dialog/CheckDialogDiceModField.svelte';
   import CheckDialogDifficultyField from '~/check/dialog/CheckDialogDifficultyField.svelte';
   import CheckDialogDifficultySummary from '~/check/dialog/CheckDialogDifficultySummary.svelte';
   import CheckDialogDoubleExpertiseField from '~/check/dialog/CheckDialogDoubleExpertiseField.svelte';
   import CheckDialogDoubleTrainingField from '~/check/dialog/CheckDialogDoubleTrainingField.svelte';
   import CheckDialogExpertiseModField from '~/check/dialog/CheckDialogExpertiseModField.svelte';
   import CheckDialogSkillField from '~/check/dialog/CheckDialogSkillField.svelte';
   import CheckDialogTotalDiceSummary from '~/check/dialog/CheckDialogTotalDiceSummary.svelte';
   import CheckDialogTotalExpertiseSummary from '~/check/dialog/CheckDialogTotalExpertiseSummary.svelte';
   import CheckDialogTrainingModField from '~/check/dialog/CheckDialogTrainingModField.svelte';
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import warn from '~/helpers/utility-functions/Warn.js';
   import { getContext } from 'svelte';

   /**
    * @typedef {object} AttributeCheckDialogShellProps
    * @property {TitanActor} [actor] The Actor that will roll the Check.
    */

   /** @type {AttributeCheckDialogShellProps} */
   const { actor = undefined } = $props();

   /** @type {import('svelte/store').Writable} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   /** @type {import('svelte/store').Writable} Reference to calculated Check Parameters Store. */
   const checkParameters = getContext('checkParameters');

   /** @type {AttributeCheckDialog} The Svelte Component's Application. */
   const application = getApplication();

   /** @type {ReactiveDocument|undefined} The reactive bridge of the Actor that will roll the check. */
   const checkActor = getContext('checkActor');

   /**
    * @type {Array<typeof import('svelte').SvelteComponent>} Components for changing the options and
    *    displaying the parameters.
    */
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
      CheckDialogAdvantageField,
      CheckDialogAutomaticFailureField,
      CheckDialogDifficultySummary,
      CheckDialogTotalDiceSummary,
      CheckDialogTotalExpertiseSummary,
   ];

   /**
    * Called when the check becomes invalid.
    */
   function onCheckInvalid() {
      ui.notifications.info(localize('attributeCheckNoLongerValid'));
      warn(
         localize('attributeCheckNoLongerValid'),
         checkOptions,
         actor,
      );
      application.close();
   }

   /**
    * Called when the Roll button is clicked.
    */
   function onRoll() {
      if (actor?.system.validateAttributeCheckOptions($checkOptions)) {
         actor.system.rollAttributeCheck($checkOptions);
      }
      else {
         onCheckInvalid();
      }
   }

   // Update the parameters whenever the check options or the Actor (its items and effects included) change; a
   // change that invalidates the check closes the dialog.
   $effect(() => {
      /** @type {TitanActor|undefined} The live Actor, read through its bridge so this effect tracks it. */
      const liveActor = checkActor?.data;
      if (liveActor?.system.validateAttributeCheckOptions($checkOptions)) {
         $checkParameters = liveActor.system.getAttributeCheckParameters($checkOptions);
      }
      else {
         onCheckInvalid();
      }
   });

</script>

<CheckDialogBase onroll={onRoll} {rows}/>
