<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import EditDeleteTag from '~/helpers/svelte-components/tag/EditDeleteTag.svelte';

   /** @type number The idx of the Trait in the item's Custom Traits array. */
   export let idx = void 0;

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /**
    * Called when the Delete icon is pressed.
    */
   function deleteFunction() {
      $document.deleteCustomTrait(idx);
   }

   /**
    * Called when the Edit icon is pressed.
    */
   function editFunction() {
      $document.editCustomTrait(idx);
   }
</script>

{#if $document.system.customTrait[idx]}
   <EditDeleteTag
      {deleteFunction}
      deleteTooltip={localize('deleteTrait')}
      {editFunction}
      editTooltip={localize('editTrait')}
      label={$document.system.customTrait[idx].name}
      labelTooltip={$document.system.customTrait[idx].description}
   />
{/if}
