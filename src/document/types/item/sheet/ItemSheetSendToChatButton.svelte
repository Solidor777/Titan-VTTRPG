<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import { SEND_TO_CHAT_ICON } from '~/system/Icons.js';
   import { getContext } from 'svelte';

   /** @type {getContext<Document>} Reference to the Document store. */
   const document = getContext('document');

</script>

<!--Import Actor Button-->
<button class="header-control icon edit-token-button"
        on:click={() => $document.sendToChat()}
        use:tooltipAction={'importActorToWorld'}>
   <i class={SEND_TO_CHAT_ICON}/>
</button>
