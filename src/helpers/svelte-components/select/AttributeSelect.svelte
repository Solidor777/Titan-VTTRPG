<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Select from '~/helpers/svelte-components/select/Select.svelte';

   // Value
   export let value = void 0;

   // Whether to allow none
   export let allowNone = false;

   export let disabled = false;

   // Options
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

   // Add none option
   if (allowNone) {
      skillOptions.push({
         label: localize('none'),
         value: 'none',
      });
   }
</script>

<div class="attribute-select {value}" on:change>
   <Select bind:value {disabled} {options}/>
</div>

<style lang="scss">
   .attribute-select {
      &.body {
         --titan-input-background: var(--titan-body-color);
      }

      &.mind {
         --titan-input-background: var(--titan-mind-color);
      }

      &.soul {
         --titan-input-background: var(--titan-soul-color);
      }
   }
</style>
