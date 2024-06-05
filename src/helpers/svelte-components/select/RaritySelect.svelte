<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Select from '~/helpers/svelte-components/select/Select.svelte';

   /** @type number The value to bind to the input. */
   export let value = void 0;

   /** @type boolean Whether the input is currently disabled. */
   export let disabled = false;

   /** @type SelectOption[] Options for the Select. */
   const rarityOptions = [
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

<div class="rarity-select {value}" on:change>
   <Select bind:value {disabled} options={rarityOptions}/>
</div>

<style lang="scss">
   .rarity-select {
      &.uncommon {
         --titan-input-background: var(--titan-uncommon-color);
      }

      &.rare {
         --titan-input-background: var(--titan-rare-color);
      }

      &.unique {
         --titan-input-background: var(--titan-unique-color);
      }
   }
</style>
