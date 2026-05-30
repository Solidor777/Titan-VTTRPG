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
   import warn from '~/helpers/utility-functions/Warn.js';

   /**
    * @typedef {object} ResistanceCheckDialogShellProps
    * @property {TitanActor} [actor] The Actor that will roll the Check.
    */

   /** @type {ResistanceCheckDialogShellProps} */
   const { actor = undefined } = $props();

   /** @type {import('svelte/store').Writable} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   /** @type {import('svelte/store').Writable} Reference to calculated Check Parameters store. */
   const checkParameters = getContext('checkParameters');

   /** @type {ResistanceCheckDialog} The Svelte Component's Application. */
   const application = getApplication();

   /** @type {Array<typeof import('svelte').SvelteComponent>} Components for changing the options and displaying the parameters. */
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

   /**
    * Called when the check becomes invalid.
    */
   function onCheckInvalid() {
      ui.notifications.info(localize('resistanceCheckNoLongerValid'));
      warn(
         localize('resistanceCheckNoLongerValid'),
         checkOptions,
         actor,
      );
      application.close();
   }

   /**
    * Called when the Roll button is clicked.
    */
   function onRoll() {
      if (actor?.system.validateResistanceCheckOptions($checkOptions)) {
         actor.system.rollResistanceCheck($checkOptions);
      }
      else {
         onCheckInvalid();
      }
   }

   // Update the parameters whenever the check options change.
   $effect(() => {
      if (actor?.system.validateResistanceCheckOptions($checkOptions)) {
         $checkParameters = actor.system.getResistanceCheckParameters($checkOptions);
      }
      else {
         onCheckInvalid();
      }
   });

</script>

<CheckDialogBase onroll={onRoll} {rows}/>
