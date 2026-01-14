<script>
   import { getContext } from 'svelte';
   import { LINKED_ICON } from '~/system/Icons.js';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   function toggleLinkedToken() {
      $document?.prototypeToken?.update({
         actorLink: !$document.prototypeToken.actorLink
      });
   }
</script>

<button class="header-control icon"
        on:click={toggleLinkedToken}>
   <i
      class="toggle-linked-token-button {
   $document?.prototypeToken?.actorLink
   ? `linked ${LINKED_ICON}`
   : `unlinked ${LINKED_ICON}`
   }"/>
</button>


<style lang="scss">
   .linked {
      color: darkorange;
      text-shadow: 0 0 8px darkorange;
   }

   .unlinked {
      color: brown;
      text-shadow: 0 0 8px brown;
   }
</style>
