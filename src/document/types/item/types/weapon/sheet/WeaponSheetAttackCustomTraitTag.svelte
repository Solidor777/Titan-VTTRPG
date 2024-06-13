<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import EditDeleteTag from '~/helpers/svelte-components/tag/EditDeleteTag.svelte';

   /** @type number The idx of the Attack in the Attacks array. */
   export let attackIdx = void 0;

   /** @type number The idx of the Trait in the Custom Traits array. */
   export let traitIdx = void 0;

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /**
    * Called when the Delete Icon is pressed.
    */
   function deleteFunction() {
      $document.deleteCustomAttackTrait(attackIdx, traitIdx);
   }

   /**
    * Called when the Edit Icon is pressed.
    */
   function editFunction() {
      $document.editCustomAttackTrait(attackIdx, traitIdx);
   }
</script>

<EditDeleteTag
   {deleteFunction}
   deleteTooltip={localize('deleteTrait')}
   {editFunction}
   editTooltip={localize('editTrait')}
   label={$document.system.attack[attackIdx].customTrait[traitIdx].name}
   labelTooltip={$document.system.attack[attackIdx].customTrait[traitIdx].description}
/>