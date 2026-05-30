<script>
   import { getContext } from 'svelte';
   import DocumentSelect from '~/document/svelte-components/select/DocumentSelect.svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';

   /**
    * @typedef {object} ItemSheetFastHealingSettingsProps
    * @property {number} [idx] The index of the rules element in the item's rules elements array.
    */

   /** @type {ItemSheetFastHealingSettingsProps} */
   const { idx = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {{label: string, value: string}[]} Options for when in the turn the Fast Healing activates. */
   const selectorOptions = [
      'turnStart',
      'turnEnd'
   ];
</script>


<!--Settings-->
<div class="settings">

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
