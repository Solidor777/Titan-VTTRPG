<script>
   import { getContext } from 'svelte';
   import EditDeleteTag from '~/helpers/svelte-components/tag/EditDeleteTag.svelte';

   /** @type {number} The idx of the Attack in the Attacks array. */
   export let attackIdx = void 0;

   /** @type {number} The idx of the Trait in the Custom Traits array. */
   export let traitIdx = void 0;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Called when the Delete button is clicked.
    */
   function deleteFunction() {
      $document.deleteCustomAttackTrait(attackIdx, traitIdx);
   }

   /**
    * Called when the Edit button is clicked.
    */
   function editFunction() {
      $document.editCustomAttackTrait(attackIdx, traitIdx);
   }
</script>

<EditDeleteTag
   {deleteFunction}
   deleteTooltip={'deleteTrait'}
   {editFunction}
   editTooltip={'editTrait'}
   label={$document.system.attack[attackIdx].customTrait[traitIdx].name}
   labelTooltip={$document.system.attack[attackIdx].customTrait[traitIdx].description}
/>
