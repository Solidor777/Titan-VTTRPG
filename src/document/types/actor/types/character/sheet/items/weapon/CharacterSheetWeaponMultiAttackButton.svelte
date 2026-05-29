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

   /** @type {TitanItem} The Item this component belongs to. */
   export let item = void 0;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<DocumentOwnerButton onclick={() => $document.system.toggleMultiAttack(item._id)}>
   <div class="button-inner">
      <i class={item.system.multiAttack ? MULTI_ATTACK_ICON : NO_MULTI_ATTCK_ICON}/>
      <div class="label">
         <Text text="multiAttack"/>
      </div>
      <i
         class={item.system.multiAttack
            ? CHECKED_ICON
            : UNCHECKED_ICON}
      />
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
