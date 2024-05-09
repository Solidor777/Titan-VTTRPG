<svelte:options accessors={true} />

<script>
   import DocumentEditTraitsDialog from '~/document/components/DocumentEditTraitsDialog.svelte';
   import {
      SHIELD_TRAITS,
      SHIELD_TRAIT_DESCRIPTIONS,
   } from '~/document/types/item/types/shield/ShieldTraits.js';

   // The weapon item owning the attack
   export let document = void 0;

   // The trait options
   let traitOptions = foundry.utils.deepClone(SHIELD_TRAITS);
   let traitDescriptions = SHIELD_TRAIT_DESCRIPTIONS;
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
      --trait-column-count: 1;
   }
</style>
