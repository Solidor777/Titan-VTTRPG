<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Select from '~/helpers/svelte-components/select/Select.svelte';

   /** @type number The value to bind to the input. */
   export let value = void 0;

   /** @type boolean Whether the input is currently disabled. */
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

