<svelte:options accessors={true}/>

<script>
   import { ATTACK_TRAIT_DESCRIPTIONS, ATTACK_TRAITS, } from '~/document/types/item/types/weapon/AttackTraits.js';
   import EditTraitsDialogBase from '~/document/types/item/dialog/EditTraitsDialogBase.svelte';

   /**
    * @typedef {object} EditAttackTraitsDialogShellProps
    * @property {object} [item] The weapon document owning the attack.
    * @property {number} [attackIdx] The attack index.
    */

   /** @type {EditAttackTraitsDialogShellProps} */
   const { item = undefined, attackIdx = undefined } = $props();

   /** @type {object[]} Trait options for the attack. */
   let traitOptions = $state(structuredClone(ATTACK_TRAITS));

   /** @type {Record<string, string>} Map of attack trait names to their description localization keys. */
   const traitDescriptions = ATTACK_TRAIT_DESCRIPTIONS;
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
