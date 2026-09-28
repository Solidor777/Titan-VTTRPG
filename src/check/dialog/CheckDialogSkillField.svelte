<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import SkillSelect from '~/helpers/svelte-components/input/select/SkillSelect.svelte';
   import { getContext } from 'svelte';

   /** @type {import('svelte/store').Writable} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   /** @type {(field: string, value: *) => void} The dialog's tracked Check Options setter. */
   const setCheckOption = getContext('setCheckOption');

   // Allow 'none' option for the skill select.
   const inputProps = { allowNone: true };
</script>

<CheckDialogField
   bind:value={
      () => $checkOptions.skill,
      (value) => setCheckOption('skill', value)
   }
   input={SkillSelect}
   {inputProps}
   label={'skill'}
   testId={'check-field-skill'}
   tooltip={'check.skill.desc'}
/>
