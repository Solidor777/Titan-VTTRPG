<script>
   import { getContext } from 'svelte';
   import { LINKED_ICON, UNLINKED_ICON } from '~/system/Icons.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** Toggles whether this Actor is linked to their Token. */
   function toggleLinkedToken() {
      document.data?.prototypeToken?.update({
         actorLink: !document.data.prototypeToken.actorLink
      });
   }
</script>

<!--Toggle Linked Button-->
<button aria-label="Toggle Token Link"
        class="header-control icon toggle-token-linked-button"
        onclick={toggleLinkedToken}
        use:tooltipAction={ document.data?.prototypeToken?.actorLink
           ? 'toggleTokenUnlinkedButton.desc'
           : 'toggleTokenLinkedButton.desc'}
>
   <i
      class={
            document.data?.prototypeToken?.actorLink
            ? `linked ${LINKED_ICON}`
            : `unlinked ${UNLINKED_ICON}`
         }
   ></i>
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
