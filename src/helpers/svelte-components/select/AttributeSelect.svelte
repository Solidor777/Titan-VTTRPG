<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Select from '~/helpers/svelte-components/select/Select.svelte';

   /** @type number The value to bind to the input. */
   export let value = void 0;

   /** @type boolean Whether to allow None as an option. */
   export let allowNone = false;

   /** @type boolean Whether the input is currently disabled. */
   export let disabled = false;

   /** @type SelectOption[] Options for the Select. */
   const options = [
      {
         label: localize('body'),
         value: 'body',
      },
      {
         label: localize('mind'),
         value: 'mind',
      },
      {
         label: localize('soul'),
         value: 'soul',
      },
   ];

   // Add none option if appropriate
   if (allowNone) {
      skillOptions.push({
         label: localize('none'),
         value: 'none',
      });
   }
</script>

<div class="{value}">
   <Select bind:value {disabled} on:change {options}/>
</div>

<style lang="scss">
   .body {
      --titan-input-background: var(--titan-body-color);
   }

   .mind {
      --titan-input-background: var(--titan-mind-color);
   }

   .soul {
      --titan-input-background: var(--titan-soul-color);
   }
</style>
