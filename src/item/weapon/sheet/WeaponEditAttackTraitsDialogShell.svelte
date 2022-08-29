<svelte:options accessors={true} />

<script>
   import { getWeaponAttackTraits } from "~/item/weapon/WeaponAttackTraits";
   import DocumentEditTraitsDialog from "~/documents/components/DocumentEditTraitsDialog.svelte";

   // The weapon document owning the attack
   export let document = void 0;

   // The attack idx
   export let attackIdx = void 0;

   // The trait options
   let traitOptions = getWeaponAttackTraits();
</script>

<div class="weapon-edit-trait-dialog">
   <DocumentEditTraitsDialog
      bind:document
      bind:documentTraits={document.system.attack[attackIdx].traits}
      bind:traitOptions
   />
</div>

<style lang="scss">
   .weapon-edit-trait-dialog {
      --trait-column-count: 2;
   }
</style>
