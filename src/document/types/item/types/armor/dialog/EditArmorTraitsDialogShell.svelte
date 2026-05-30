<svelte:options accessors={true}/>

<script>
   import { ARMOR_TRAIT_DESCRIPTIONS, ARMOR_TRAITS, } from '~/document/types/item/types/armor/ArmorTraits.js';
   import EditTraitsDialogBase from '~/document/types/item/dialog/EditTraitsDialogBase.svelte';

   /**
    * @typedef {object} EditArmorTraitsDialogShellProps
    * @property {object} [item] The armor item owning the traits being edited.
    */

   /** @type {EditArmorTraitsDialogShellProps} */
   const { item = undefined } = $props();

   /** @type {object[]} The available armor trait options. */
   let traitOptions = $state(structuredClone(ARMOR_TRAITS));

   /** @type {Record<string, string>} Map of armor trait names to their description localization keys. */
   const traitDescriptions = ARMOR_TRAIT_DESCRIPTIONS;
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
