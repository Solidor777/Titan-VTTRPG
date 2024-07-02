<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import SkillSelect from '~/helpers/svelte-components/select/SkillSelect.svelte';
   import {getContext} from 'svelte';

   /** @type object Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   // Allow 'none' option for the skill select.
   const inputProps = {allowNone: true};
</script>

<CheckDialogField
   bind:value={$checkOptions.skill}
   fieldTooltip="{localize('check.skill.desc')}"
   input={SkillSelect}
   {inputProps}
   label="{localize('skill')}"
   on:change
/>
