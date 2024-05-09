<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import SkillSelect from '~/helpers/svelte-components/select/SkillSelect.svelte';
   import { getContext } from 'svelte';

   /** @type {CheckOptions}   Reference to the Check Options. */
   const checkOptions = getContext('checkOptions');

   // Allow 'none' option for the skill select.
   const inputProps = { allowNone: true };
</script>

<CheckDialogField
   input={SkillSelect}
   label="{localize('skill')}"
   fieldTooltip="{localize('check.skill.desc')}"
   bind:value={$checkOptions.skill}
   on:change
   {inputProps}
/>
