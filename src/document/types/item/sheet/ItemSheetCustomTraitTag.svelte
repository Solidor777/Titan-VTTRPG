<script>
   import { getContext } from 'svelte';
   import EditDeleteTag from '~/helpers/svelte-components/tag/EditDeleteTag.svelte';

   /**
    * @typedef {object} ItemSheetCustomTraitTagProps
    * @property {number} [idx] The index of the Trait in the item's Custom Traits array.
    */

   /** @type {ItemSheetCustomTraitTagProps} */
   const { idx = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Called when the Delete button is clicked.
    * @returns {void}
    */
   function deleteFunction() {
      document.data.deleteCustomTrait(idx);
   }

   /**
    * Called when the Edit button is clicked.
    * @returns {void}
    */
   function editFunction() {
      document.data.editCustomTrait(idx);
   }
</script>

{#if document.data.system.customTrait[idx]}
   <EditDeleteTag
      {deleteFunction}
      deleteTooltip={'deleteTrait'}
      {editFunction}
      editTooltip={'editTrait'}
      label={document.data.system.customTrait[idx].name}
      labelTooltip={{ text: document.data.system.customTrait[idx].description, localize: false }}
   />
{/if}
