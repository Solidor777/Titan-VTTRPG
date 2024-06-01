<svelte:options accessors={true}/>

<script>
   import {ARMOR_TRAIT_DESCRIPTIONS, ARMOR_TRAITS,} from '~/document/types/item/types/armor/ArmorTraits.js';
   import EditTraitsDialogBase from '~/document/types/item/dialog/EditTraitsDialogBase.svelte';

   // The weapon item owning the attack
   export let item = void 0;

   // The trait options
   let traitOptions = foundry.utils.deepClone(ARMOR_TRAITS);
   let traitDescriptions = ARMOR_TRAIT_DESCRIPTIONS;
</script>

<div class="edit-traits-dialog">
   <EditTraitsDialogBase
      bind:documentTraits={item.system.trait}
      bind:traitOptions
      {item}
      {traitDescriptions}
   />
</div>

<style lang="scss">
   .edit-traits-dialog {
      --trait-column-count: 2;
   }
</style>
