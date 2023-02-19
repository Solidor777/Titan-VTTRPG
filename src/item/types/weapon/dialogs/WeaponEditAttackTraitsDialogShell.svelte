<svelte:options accessors={true} />

<script>
   import DocumentEditTraitsDialog from '~/documents/components/DocumentEditTraitsDialog.svelte';
   import WEAPON_TRAITS from '~/item/types/weapon/WeaponTraits.js';

   // The weapon document owning the attack
   export let document = void 0;

   // The attack idx
   export let attackIdx = void 0;

   // Trait options
   let traitOptions = foundry.utils.deepClone(WEAPON_TRAITS);
</script>

<div class="edit-traits-dialog">
   <DocumentEditTraitsDialog
      {document}
      bind:documentTraits={document.system.attack[attackIdx].trait}
      bind:traitOptions
   />
</div>

<style lang="scss">
   .edit-traits-dialog {
      --trait-column-count: 2;
   }
</style>
