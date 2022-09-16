<svelte:options accessors={true} />

<script>
   import { getArmorTraits } from "~/item/types/armor/ArmorTraits";
   import DocumentEditTraitsDialog from "~/documents/components/DocumentEditTraitsDialog.svelte";

   // The weapon item owning the attack
   export let document = void 0;

   // The trait options
   let traitOptions = getArmorTraits();
</script>

<div class="armor-edit-trait-dialog">
   <DocumentEditTraitsDialog bind:document bind:documentTraits={document.system.traits} bind:traitOptions />
</div>

<style lang="scss">
   .armor-edit-trait-dialog {
      --trait-column-count: 1;
   }
</style>
