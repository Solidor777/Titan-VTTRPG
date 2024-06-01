<svelte:options accessors={true}/>

<script>
   import {SHIELD_TRAIT_DESCRIPTIONS, SHIELD_TRAITS,} from '~/document/types/item/types/shield/ShieldTraits.js';
   import EditTraitsDialogBase from '~/document/types/item/dialog/EditTraitsDialogBase.svelte';

   // The weapon item owning the attack
   export let item = void 0;

   // The trait options
   let traitOptions = foundry.utils.deepClone(SHIELD_TRAITS);
   let traitDescriptions = SHIELD_TRAIT_DESCRIPTIONS;
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
      --trait-column-count: 1;
   }
</style>
