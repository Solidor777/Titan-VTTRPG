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
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import CheckDialogDamageModField from '~/check/dialog/CheckDialogDamageModField.svelte';

   /** @type TitanActor The Actor that will roll the Check. */
   export let actor = void 0;

   /** @type {AttackCheckOptions}   Reference to the Check Options. */
   const checkOptions = getContext('checkOptions');

   /** @type {AttackCheckParameters}   Reference to calculated Check Parameters. */
   const checkParameters = getContext('checkParameters');

   /** @type {Application} Reference to the dialog application. */
   const application = getApplication();

   /** @type {*[]} Components for changing the options and displaying the parameters. */
   const rows = [
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
   ];

   /** @type Function Called when the check becomes invalid. */
   function onCheckInvalid() {
      ui.notifications.info(localize('attackCheckNoLongerValid'));
      game.titan.warn(
         localize('attackCheckNoLongerValid'),
         true,
         checkOptions,
         actor,
      );
      application.close();
   }

   /** @type Function Called when the Roll button is clicked. */
   function onRoll() {
      if (actor?.system.validateAttackCheckOptions($checkOptions)) {
         actor.system.rollAttackCheck($checkOptions);
      }
      else {
         onCheckInvalid();
      }
   }

   // Update the parameters whenever the check options are displayed
   $: {
      if (actor?.system.validateAttackCheckOptions($checkOptions)) {
         $checkParameters = actor.system.getAttackCheckParameters($checkOptions);
      }
      else {
         onCheckInvalid();
      }
   }

   // Update the first row whenever the attack type is changed
   $: rows[0] = $checkOptions.type === 'melee' ? AttackCheckDialogMeleeField : AttackCheckDialogAccuracyField;

</script>

<CheckDialogBase {rows} on:roll={onRoll}/>
