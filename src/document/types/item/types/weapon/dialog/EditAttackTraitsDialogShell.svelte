<svelte:options accessors={true}/>

<script>
   import {ATTACK_TRAIT_DESCRIPTIONS, ATTACK_TRAITS,} from '~/document/types/item/types/weapon/AttackTraits.js';
   import EditTraitsDialogBase from '~/document/types/item/dialog/EditTraitsDialogBase.svelte';

   // The weapon document owning the attack
   export let item = void 0;

   // The attack idx
   export let attackIdx = void 0;

   // Trait options
   let traitOptions = foundry.utils.deepClone(ATTACK_TRAITS);
   let traitDescriptions = ATTACK_TRAIT_DESCRIPTIONS;
</script>

<div class="edit-traits-dialog">
   <EditTraitsDialogBase
      bind:documentTraits={item.system.attack[attackIdx].trait}
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
