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
   import warn from '~/helpers/utility-functions/Warn.js';
   import { getContext } from 'svelte';

   /**
    * @typedef {object} CastingCheckDialogShellProps
    * @property {TitanActor} [actor] The Actor that will roll the Check.
    */

   /** @type {CastingCheckDialogShellProps} */
   const { actor = undefined } = $props();

   /** @type {import('svelte/store').Writable} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   /** @type {import('svelte/store').Writable} Reference to calculated Check Parameters Store. */
   const checkParameters = getContext('checkParameters');

   /** @type {CastingCheckDialog} The Svelte Component's Application. */
   const application = getApplication();

   /** @type {Array<typeof import('svelte').SvelteComponent>} Base template for the component rows. */
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

   /** @type {Array<typeof import('svelte').SvelteComponent>} Components for changing the options and displaying the parameters. */
   let rows = $state(baseRows);

   /**
    * Called when the check becomes invalid.
    */
   function onCheckInvalid() {
      ui.notifications.info(localize('castingCheckNoLongerValid'));
      warn(
         localize('castingCheckNoLongerValid'),
         checkOptions,
         actor,
      );
      application.close();
   }

   /**
    * Called when the Roll button is clicked.
    */
   function onRoll() {
      if (actor?.system.validateCastingCheckOptions($checkOptions)) {
         actor.system.rollCastingCheck($checkOptions);
      }
      else {
         onCheckInvalid();
      }
   }

   // Update the parameters whenever the check options change.
   $effect(() => {
      if (actor?.system.validateCastingCheckOptions($checkOptions)) {
         $checkParameters = actor.system.getCastingCheckParameters($checkOptions);
      }
      else {
         onCheckInvalid();
      }
   });

   // Update whether Damage and Healing mod fields are displayed.
   $effect(() => {
      // Reset the rows.
      rows = [...baseRows];

      // Add the Healing Mod field.
      if ($checkParameters.healing) {
         rows.splice(
            4,
            0,
            CheckDialogHealingModField,
         );
      }

      // Add the Damage Mod field.
      if ($checkParameters.damage) {
         rows.splice(
            4,
            0,
            CheckDialogDamageModField,
         );
      }
   });

</script>

<CheckDialogBase onroll={onRoll} {rows}/>
