<script>
   import Text from '~/helpers/svelte-components/Text.svelte';
   import { getContext } from 'svelte';
   import DocumentOwnerButton from '~/document/svelte-components/DocumentOwnerButton.svelte';
   import {
      CHECKED_ICON,
      MULTI_ATTACK_ICON,
      NO_MULTI_ATTCK_ICON,
      UNCHECKED_ICON,
   } from '~/system/Icons.js';

   /**
    * @typedef {object} CharacterSheetWeaponMultiAttackButtonProps
    * @property {TitanItem} [item] The Item this component belongs to.
    */

   /** @type {CharacterSheetWeaponMultiAttackButtonProps} */
   const { item = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {boolean} Whether this Weapon is multi attacking, read reactively through document.data. */
   const multiAttack = $derived(document.data.items.get(item._id)?.system.multiAttack);
</script>

<DocumentOwnerButton onclick={() => document.data.system.toggleMultiAttack(item._id)}>
   <div class="button-inner">
      <i class={multiAttack ? MULTI_ATTACK_ICON : NO_MULTI_ATTCK_ICON}></i>
      <div class="label">
         <Text text="multiAttack"/>
      </div>
      <i
         class={multiAttack
            ? CHECKED_ICON
            : UNCHECKED_ICON}
      ></i>
   </div>
</DocumentOwnerButton>

<style lang="scss">
   .button-inner {
      @include flex-row;
      @include flex-group-center;

      height: 100%;

      :not(:first-child) {
         @include margin-left-standard;
      }
   }
</style>
