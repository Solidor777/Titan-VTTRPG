<script>
   import { getContext } from 'svelte';
   import { LINKED_ICON, UNLINKED_ICON } from '~/system/Icons.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type {getContext<Document>} Reference to the Document store. */
   const document = getContext('document');

   /** Toggles whether this Actor is linked to their Token. */
   function toggleLinkedToken() {
      $document?.prototypeToken?.update({
         actorLink: !$document.prototypeToken.actorLink
      });
   }
</script>

<!--Toggle Linked Button-->
<button class="header-control icon toggle-token-linked-button"
        on:click={toggleLinkedToken}
        use:tooltipAction={ $document?.prototypeToken?.actorLink
           ? 'toggleTokenUnlinkedButton.desc'
           : 'toggleTokenLinkedButton.desc'}
>
   <i
      class={
            $document?.prototypeToken?.actorLink
            ? `linked ${LINKED_ICON}`
            : `unlinked ${UNLINKED_ICON}`
         }
   />
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
