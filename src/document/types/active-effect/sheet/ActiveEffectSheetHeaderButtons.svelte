<script>
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import { SEND_TO_CHAT_ICON } from '~/system/Icons.js';

   /** @type {import('./TitanActiveEffectSheet.js').default} The owning Active Effect sheet. */
   const application = getApplication();
</script>

<!-- Send to Chat -->
<button aria-label={localize('sendToChat')}
        class="header-control icon titan-header-button send-to-chat-button"
        onclick={() => application.effect.sendToChat()}
        use:tooltipAction={'sendEffectToChat.desc'}
>
   <i class={SEND_TO_CHAT_ICON}></i>
</button>
