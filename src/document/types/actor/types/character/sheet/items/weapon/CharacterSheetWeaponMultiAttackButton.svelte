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

   /** @type {object} The embedded weapon bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The owning sheet's actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');

   /** @type {boolean} Whether this Weapon is multi attacking, read reactively through the embedded bridge. */
   const multiAttack = $derived(document.data?.system.multiAttack);
</script>

<DocumentOwnerButton onclick={() => sheetDocument.data.system.toggleMultiAttack(document.data?._id)}>
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
