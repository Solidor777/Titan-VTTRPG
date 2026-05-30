<svelte:options accessors={true}/>

<script>
   import { SHIELD_TRAIT_DESCRIPTIONS, SHIELD_TRAITS, } from '~/document/types/item/types/shield/ShieldTraits.js';
   import EditTraitsDialogBase from '~/document/types/item/dialog/EditTraitsDialogBase.svelte';

   /**
    * @typedef {object} EditShieldTraitsDialogShellProps
    * @property {object} [item] The shield item owning the traits being edited.
    */

   /** @type {EditShieldTraitsDialogShellProps} */
   const { item = undefined } = $props();

   /** @type {object[]} The available shield trait options. */
   let traitOptions = $state(structuredClone(SHIELD_TRAITS));

   /** @type {Record<string, string>} Map of shield trait names to their description localization keys. */
   const traitDescriptions = SHIELD_TRAIT_DESCRIPTIONS;
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
