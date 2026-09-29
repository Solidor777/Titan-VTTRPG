<script>
   import CheckDialogField from '~/check/dialog/CheckDialogField.svelte';
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import { ADVANTAGE_LEVEL_OPTIONS, clampAdvantage } from '~/check/ApplyAdvantage.js';
   import { getContext } from 'svelte';

   /** @type {import('svelte/store').Readable} The dialog's read-only Check Options view. */
   const checkOptions = getContext('checkOptions');

   /** @type {(field: string, value: *) => void} The dialog's tracked Check Options setter. */
   const setCheckOption = getContext('setCheckOption');

   /** @type {object} Properties for the level select. */
   const inputProps = { options: ADVANTAGE_LEVEL_OPTIONS };
</script>

<!--Shows the summed Advantage at its clamped level; picking a level replaces the sum.-->
<CheckDialogField
   bind:value={
      () => clampAdvantage($checkOptions.advantage),
      (level) => setCheckOption('advantage', level)
   }
   input={Select}
   {inputProps}
   label={'advantage'}
   testId={'check-field-advantage'}
   tooltip={'check.advantage.desc'}
/>
