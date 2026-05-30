<script>
   import { getContext } from 'svelte';
   import DocumentSelect from '~/document/svelte-components/select/DocumentSelect.svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import ItemSheetRulesElementOperationSelect
      from '~/document/types/item/sheet/rules-element/ItemSheetRulesElementOperationSelect.svelte';

   /**
    * @typedef {object} ItemSheetPersistentDamageSettingsProps
    * @property {number} [idx] The index of the rules element in the item's rules elements array.
    */

   /** @type {ItemSheetPersistentDamageSettingsProps} */
   const { idx = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {string[]} Options for which turn the persistent damage activates. */
   const selectorOptions = [
      'turnStart',
      'turnEnd',
   ];
</script>


<!--Operation settings-->
<div class="settings">
   <div class="field select">
      <ItemSheetRulesElementOperationSelect {idx}/>
   </div>

   <!--Selector-->
   <div class="field select">
      <DocumentSelect
         bind:value={document.data.system.rulesElement[idx].selector}
         options={selectorOptions}
      />
   </div>

   <!--Value-->
   <div class="field number">
      <DocumentIntegerInput bind:value={document.data.system.rulesElement[idx].value} min={1}/>
   </div>
</div>

<style lang="scss">
   .settings {
      @include tag-container;
      @include flex-group-left;

      width: 100%;

      .field {
         @include flex-row;

         &.select {
            @include flex-group-left;
         }

         &.number {
            @include flex-group-center;
         }
      }
   }
</style>
