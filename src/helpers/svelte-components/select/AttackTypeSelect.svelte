<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Select from '~/helpers/svelte-components/select/Select.svelte';

   /** @type string The value that this input should modify. */
   export let value = void 0;

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type SelectOption[] Options for the Select. */
   const options = [
      {
         label: localize('melee'),
         value: 'melee',
      },
      {
         label: localize('ranged'),
         value: 'ranged',
      },
   ];
</script>

<div class="attribute-select {value}">
   <Select bind:value {disabled} on:change {options}/>
</div>

<style lang="scss">
   .attribute-select {
      @include attribute-colors;
   }
</style>

