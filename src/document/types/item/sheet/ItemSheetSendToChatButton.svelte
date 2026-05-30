<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import { SEND_TO_CHAT_ICON } from '~/system/Icons.js';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<!--Send to Chat Button-->
<button class="header-control icon edit-token-button"
        onclick={() => $document.sendToChat()}
        use:tooltipAction={'importActorToWorld'}>
   <i class={SEND_TO_CHAT_ICON}></i>
</button>
