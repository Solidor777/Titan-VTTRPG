<svelte:options accessors={true} />

<script>
   import DocumentEditTraitsDialog from '~/document/components/DocumentEditTraitsDialog.svelte';
   import {
      ATTACK_TRAITS,
      ATTACK_TRAIT_DESCRIPTIONS,
   } from '~/document/types/item/types/weapon/AttackTraits.js';

   // The weapon document owning the attack
   export let document = void 0;

   // The attack idx
   export let attackIdx = void 0;

   // Trait options
   let traitOptions = foundry.utils.deepClone(ATTACK_TRAITS);
   let traitDescriptions = ATTACK_TRAIT_DESCRIPTIONS;
</script>

<div class="edit-traits-dialog">
   <DocumentEditTraitsDialog
      {traitDescriptions}
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
