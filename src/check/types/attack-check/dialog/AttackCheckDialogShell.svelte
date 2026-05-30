<script>
   import CheckDialogAttributeField from '~/check/dialog/CheckDialogAttributeField.svelte';
   import CheckDialogBase from '~/check/dialog/CheckDialogBase.svelte';
   import { getContext } from 'svelte';
   import CheckDialogSkillField from '~/check/dialog/CheckDialogSkillField.svelte';
   import CheckDialogDiceModField from '~/check/dialog/CheckDialogDiceModField.svelte';
   import CheckDialogTrainingModField from '~/check/dialog/CheckDialogTrainingModField.svelte';
   import CheckDialogExpertiseModField from '~/check/dialog/CheckDialogExpertiseModField.svelte';
   import CheckDialogDoubleTrainingField from '~/check/dialog/CheckDialogDoubleTrainingField.svelte';
   import CheckDialogDoubleExpertiseField from '~/check/dialog/CheckDialogDoubleExpertiseField.svelte';
   import CheckDialogTotalDiceSummary from '~/check/dialog/CheckDialogTotalDiceSummary.svelte';
   import CheckDialogTotalExpertiseSummary from '~/check/dialog/CheckDialogTotalExpertiseSummary.svelte';
   import AttackCheckDialogAttackTypeField
      from '~/check/types/attack-check/dialog/AttackCheckDialogAttackTypeField.svelte';
   import AttackCheckDialogAccuracyField
      from '~/check/types/attack-check/dialog/AttackCheckDialogAttackerAccuracyField.svelte';
   import AttackCheckDialogMeleeField
      from '~/check/types/attack-check/dialog/AttackCheckDialogAttackerMeleeField.svelte';
   import AttackCheckDialogDefenseField
      from '~/check/types/attack-check/dialog/AttackCheckDialogTargetDefenseField.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import warn from '~/helpers/utility-functions/Warn.js';
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import CheckDialogDamageModField from '~/check/dialog/CheckDialogDamageModField.svelte';

   /**
    * @typedef {object} AttackCheckDialogShellProps
    * @property {TitanActor} [actor] The Actor that will roll the Check.
    */

   /** @type {AttackCheckDialogShellProps} */
   const { actor = undefined } = $props();

   /** @type {import('svelte/store').Writable} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   /** @type {import('svelte/store').Writable} Reference to calculated Check Parameters Store. */
   const checkParameters = getContext('checkParameters');

   /** @type {AttackCheckDialog} The Svelte Component's Application. */
   const application = getApplication();

   /** @type {Array<typeof import('svelte').SvelteComponent>} Components for changing the options and displaying the parameters. */
   let rows = $state([
      AttackCheckDialogMeleeField,
      AttackCheckDialogDefenseField,
      AttackCheckDialogAttackTypeField,
      CheckDialogAttributeField,
      CheckDialogSkillField,
      CheckDialogDamageModField,
      CheckDialogDiceModField,
      CheckDialogTrainingModField,
      CheckDialogExpertiseModField,
      CheckDialogDoubleTrainingField,
      CheckDialogDoubleExpertiseField,
      CheckDialogTotalDiceSummary,
      CheckDialogTotalExpertiseSummary,
   ]);

   /**
    * Called when the check becomes invalid.
    */
   function onCheckInvalid() {
      ui.notifications.info(localize('attackCheckNoLongerValid'));
      warn(
         localize('attackCheckNoLongerValid'),
         checkOptions,
         actor,
      );
      application.close();
   }

   /**
    * Called when the Roll button is clicked.
    */
   function onRoll() {
      if (actor?.system.validateAttackCheckOptions($checkOptions)) {
         actor.system.rollAttackCheck($checkOptions);
      }
      else {
         onCheckInvalid();
      }
   }

   // Update the parameters whenever the check options change.
   $effect(() => {
      if (actor?.system.validateAttackCheckOptions($checkOptions)) {
         $checkParameters = actor.system.getAttackCheckParameters($checkOptions);
      }
      else {
         onCheckInvalid();
      }
   });

   // Update the first row whenever the attack type is changed.
   $effect(() => {
      rows[0] = $checkOptions.type === 'melee' ? AttackCheckDialogMeleeField : AttackCheckDialogAccuracyField;
   });

</script>

<CheckDialogBase onroll={onRoll} {rows}/>
