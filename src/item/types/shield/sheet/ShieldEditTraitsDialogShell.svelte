<svelte:options accessors={true} />

<script>
   import DocumentEditTraitsDialog from "~/documents/components/DocumentEditTraitsDialog.svelte";

   // The weapon item owning the attack
   export let document = void 0;

   // The trait options
   let traitOptions = [
      {
         name: "magical",
         type: "boolean",
         value: false,
      },
   ];
</script>

<div class="shield-edit-trait-dialog">
   <DocumentEditTraitsDialog bind:document bind:documentTraits={document.system.trait} bind:traitOptions />
</div>

<style lang="scss">
   .shield-edit-trait-dialog {
      --trait-column-count: 1;
   }
</style>
