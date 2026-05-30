<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import { SEND_TO_CHAT_ICON } from '~/system/Icons.js';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<!--Send to Chat Button-->
<button aria-label={localize('sendToChat')}
        class="header-control icon edit-token-button"
        onclick={() => document.data.sendToChat()}
        use:tooltipAction={'importActorToWorld'}>
   <i class={SEND_TO_CHAT_ICON}></i>
</button>
