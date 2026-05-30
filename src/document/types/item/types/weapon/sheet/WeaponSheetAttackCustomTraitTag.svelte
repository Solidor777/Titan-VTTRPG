<script>
   import { getContext } from 'svelte';
   import EditDeleteTag from '~/helpers/svelte-components/tag/EditDeleteTag.svelte';

   /**
    * @typedef {object} WeaponSheetAttackCustomTraitTagProps
    * @property {number} [attackIdx] The idx of the Attack in the Attacks array.
    * @property {number} [traitIdx] The idx of the Trait in the Custom Traits array.
    */

   /** @type {WeaponSheetAttackCustomTraitTagProps} */
   const { attackIdx = undefined, traitIdx = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Called when the Delete button is clicked.
    * @returns {void}
    */
   function deleteFunction() {
      document.data.deleteCustomAttackTrait(attackIdx, traitIdx);
   }

   /**
    * Called when the Edit button is clicked.
    * @returns {void}
    */
   function editFunction() {
      document.data.editCustomAttackTrait(attackIdx, traitIdx);
   }
</script>

<EditDeleteTag
   {deleteFunction}
   deleteTooltip={'deleteTrait'}
   {editFunction}
   editTooltip={'editTrait'}
   label={document.data.system.attack[attackIdx].customTrait[traitIdx].name}
   labelTooltip={document.data.system.attack[attackIdx].customTrait[traitIdx].description}
/>
