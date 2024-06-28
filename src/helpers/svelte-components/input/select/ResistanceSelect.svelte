<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';

   /** @type string The value that this input should modify. */
   export let value = void 0;

   /** @type boolean Whether to allow None as an option. */
   export let allowNone = false;

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type SelectOption[] Options for the Select. */
   const options = [
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

   // Add None option if appropriate.
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
         --titan-input-background: var(--titan-reflexes-background);
      }

      &.resilience {
         --titan-input-background: var(--titan-resilience-background);
      }

      &.willpower {
         --titan-input-background: var(--titan-willpower-background);
      }
   }
</style>
