<svelte:options accessors={true} />

<script>
   import DocumentEditTraitsDialog from "~/documents/components/DocumentEditTraitsDialog.svelte";
   import WeaponAttackTraits from "./WeaponAttackTraits";

   // The weapon document owning the attack
   export let document = void 0;

   // The attack idx
   export let attackIdx = void 0;

   // Trait options
   let traitOptions = structuredClone(WeaponAttackTraits);
</script>

<div class="weapon-edit-trait-dialog">
   <DocumentEditTraitsDialog
      {document}
      bind:documentTraits={document.system.attack[attackIdx].traits}
      bind:traitOptions
   />
</div>

<style lang="scss">
   .weapon-edit-trait-dialog {
      --trait-column-count: 2;
   }
</style>
