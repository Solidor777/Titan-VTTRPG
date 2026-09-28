<script>
   import CheckDialogAdvantageField from '~/check/dialog/CheckDialogAdvantageField.svelte';
   import CheckDialogAttributeField from '~/check/dialog/CheckDialogAttributeField.svelte';
   import CheckDialogAutomaticFailureField from '~/check/dialog/CheckDialogAutomaticFailureField.svelte';
   import CheckDialogBase from '~/check/dialog/CheckDialogBase.svelte';
   import CheckDialogComplexityField from '~/check/dialog/CheckDialogComplexityField.svelte';
   import CheckDialogDamageModField from '~/check/dialog/CheckDialogDamageModField.svelte';
   import CheckDialogDiceModField from '~/check/dialog/CheckDialogDiceModField.svelte';
   import CheckDialogDifficultyField from '~/check/dialog/CheckDialogDifficultyField.svelte';
   import CheckDialogDifficultySummary from '~/check/dialog/CheckDialogDifficultySummary.svelte';
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
   import { rederiveActorCheckOptionFields } from '~/check/dialog/ReinitializeCheckOptions.js';
   import { getContext, untrack } from 'svelte';

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

   /** @type {ReactiveDocument|undefined} The reactive bridge of the Actor that will roll the check. */
   const checkActor = getContext('checkActor');

   /** @type {Set<string>} The actor-derived fields the user has edited in this dialog. */
   const touchedFields = getContext('touchedCheckOptionFields');

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
      CheckDialogAdvantageField,
      CheckDialogAutomaticFailureField,
      CheckDialogDifficultySummary,
      CheckDialogTotalDiceSummary,
      CheckDialogTotalExpertiseSummary,
   ];

   /**
    * @type {Array<typeof import('svelte').SvelteComponent>} Components for changing the options and
    *    displaying the parameters.
    */
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

   // Re-derive the actor-derived option fields (Dice/Training/Expertise/Damage/Healing Mod, Advantage, Automatic
   // Failure) from the live Actor whenever it, or one of its items or effects, changes; a field the user has
   // touched in the dialog is preserved. Reads the current options untracked so this effect reacts only to the
   // Actor, never to its own write back into the store below (which would otherwise retrigger it).
   $effect(() => {
      /** @type {TitanActor|undefined} The live Actor, read through its bridge so this effect tracks it. */
      const liveActor = checkActor?.data;
      if (!liveActor) {
         return;
      }

      /** @type {object|undefined} The re-derived options, or undefined if nothing actually changed. */
      const nextOptions = rederiveActorCheckOptionFields(
         untrack(() => $checkOptions),
         touchedFields,
         'casting',
         (options) => liveActor.system.initializeCastingCheckOptions(options),
      );
      if (nextOptions) {
         $checkOptions = nextOptions;
      }
   });

   // Update the parameters whenever the check options change; a change that invalidates the check closes the dialog.
   $effect(() => {
      /** @type {TitanActor|undefined} The live Actor, read through its bridge so this effect tracks it. */
      const liveActor = checkActor?.data;
      if (liveActor?.system.validateCastingCheckOptions($checkOptions)) {
         $checkParameters = liveActor.system.getCastingCheckParameters($checkOptions);
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
