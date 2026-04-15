<script>
   import { getContext } from 'svelte';
   import EditDeleteTag from '~/helpers/svelte-components/tag/EditDeleteTag.svelte';

   /** @type {number} The index of the Trait in the item's Custom Traits array. */
   export let idx = void 0;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Called when the Delete button is clicked.
    * @returns {void}
    */
   function deleteFunction() {
      $document.deleteCustomTrait(idx);
   }

   /**
    * Called when the Edit button is clicked.
    * @returns {void}
    */
   function editFunction() {
      $document.editCustomTrait(idx);
   }
</script>

{#if $document.system.customTrait[idx]}
   <EditDeleteTag
      {deleteFunction}
      deleteTooltip={'deleteTrait'}
      {editFunction}
      editTooltip={'editTrait'}
      label={$document.system.customTrait[idx].name}
      labelTooltip={$document.system.customTrait[idx].description}
   />
{/if}
