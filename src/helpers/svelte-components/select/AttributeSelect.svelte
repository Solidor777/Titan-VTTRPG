<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Select from '~/helpers/svelte-components/select/Select.svelte';

   /** @type string The value that this input should modify. */
   export let value = void 0;

   /** @type boolean Whether to allow None as an option. */
   export let allowNone = false;

   /** @type boolean Whether the input should currently be disabled. */
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
      options.push({
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
      --titan-input-background: var(--titan-body-background);
      --titan-static-background: var(--titan-body-background);
   }

   .mind {
      --titan-input-background: var(--titan-mind-background);
   }

   .soul {
      --titan-input-background: var(--titan-soul-background);
   }
</style>
