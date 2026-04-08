<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import SkillSelect from '~/helpers/svelte-components/input/select/SkillSelect.svelte';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   // Allow 'none' option for the skill select.
   const inputProps = { allowNone: true };
</script>

<CheckDialogField
   bind:value={$checkOptions.skill}
   input={SkillSelect}
   {inputProps}
   label={'skill'}
   on:change
   tooltip={'check.skill.desc'}
/>
