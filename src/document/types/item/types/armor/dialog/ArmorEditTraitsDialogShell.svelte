<svelte:options accessors={true} />

<script>
   import DocumentEditTraitsDialog from '~/document/components/DocumentEditTraitsDialog.svelte';
   import {
      ARMOR_TRAIT_DESCRIPTIONS,
      ARMOR_TRAITS,
   } from '~/document/types/item/types/armor/ArmorTraits.js';

   // The weapon item owning the attack
   export let document = void 0;

   // The trait options
   let traitOptions = foundry.utils.deepClone(ARMOR_TRAITS);
   let traitDescriptions = ARMOR_TRAIT_DESCRIPTIONS;
</script>

<div class="edit-traits-dialog">
   <DocumentEditTraitsDialog
      {traitDescriptions}
      {document}
      bind:documentTraits={document.system.trait}
      bind:traitOptions
   />
</div>

<style lang="scss">
   .edit-traits-dialog {
      --trait-column-count: 2;
   }
</style>
