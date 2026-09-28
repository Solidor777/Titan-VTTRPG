<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import { ADVANTAGE_LEVEL_OPTIONS, clampAdvantage } from '~/check/ApplyAdvantage.js';
   import { touchCheckOptionField } from '~/check/dialog/ReinitializeCheckOptions.js';
   import { getContext } from 'svelte';

   /** @type {import('svelte/store').Writable} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   /** @type {Set<string>} The actor-derived fields the user has edited in this dialog. */
   const touchedFields = getContext('touchedCheckOptionFields');

   /** @type {object} Properties for the level select. */
   const inputProps = { options: ADVANTAGE_LEVEL_OPTIONS };
</script>

<!--Shows the summed Advantage at its clamped level; picking a level replaces the sum.-->
<CheckDialogField
   bind:value={
      () => clampAdvantage($checkOptions.advantage),
      (level) => {
         $checkOptions.advantage = level;
         touchCheckOptionField(touchedFields, 'advantage');
      }
   }
   input={Select}
   {inputProps}
   label={'advantage'}
   testId={'check-field-advantage'}
   tooltip={'check.advantage.desc'}
/>
