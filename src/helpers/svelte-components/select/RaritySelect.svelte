<script>
   import localize from '~/helpers/utility-functions/Localize.js';

   /** @type string The value that this input should modify. */
   export let value = void 0;

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type SelectOption[] Options for the Select svelte component. */
   const options = [
      {
         label: localize('common'),
         value: 'common',
      },
      {
         label: localize('uncommon'),
         value: 'uncommon',
      },
      {
         label: localize('rare'),
         value: 'rare',
      },
      {
         label: localize('unique'),
         value: 'unique',
      },
   ];
</script>

<select
   bind:value
   class={value}
   {disabled}
   on:change>
   {#each options as option}
      <option value={option.value}>
         {option.label}
      </option>
   {/each}
</select>

<style lang="scss">
   select {
      @include input;
      @include rarity-input;
   }
</style>
