<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Select from '~/helpers/svelte-components/select/Select.svelte';

   // Value
   export let value = void 0;

   // Whether to allow none
   export let allowNone = false;

   export let disabled = false;

   // Options
   export let options = [
      {
         label: localize('reflexes'),
         value: 'reflexes',
      },
      {
         label: localize('resilience'),
         value: 'resilience',
      },
      {
         label: localize('willpower'),
         value: 'willpower',
      },
   ];

   // Add none option
   if (allowNone) {
      options.push({
         label: localize('none'),
         value: 'none',
      });
   }
</script>

<div class="resistance-select {value}" on:change>
   <Select bind:value {disabled} {options}/>
</div>

<style lang="scss">
   .resistance-select {
      &.reflexes {
         --titan-input-background: var(--titan-reflexes-color);
      }

      &.resilience {
         --titan-input-background: var(--titan-resilience-color);
      }

      &.willpower {
         --titan-input-background: var(--titan-willpower-color);
      }
   }
</style>
