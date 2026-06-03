<script>
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import { IMPORT_ICON, SEND_TO_CHAT_ICON } from '~/system/Icons.js';

   /** @type {import('./TitanItemSheet.js').default} The owning Item sheet. */
   const application = getApplication();

   /** @type {boolean} Whether this Item can be imported from its compendium pack. */
   const canImport = !!application.item.pack;
</script>

<!-- Send to Chat -->
<button aria-label={localize('sendToChat')}
        class="header-control icon titan-header-button send-to-chat-button"
        onclick={() => application.item.sendToChat()}
        use:tooltipAction={'sendItemToChat.desc'}
>
   <i class={SEND_TO_CHAT_ICON}></i>
</button>

{#if canImport}
   <!-- Import Item -->
   <button aria-label={localize('importItem')}
           class="header-control icon titan-header-button import-item-button"
           onclick={() => application._onImportItem()}
           use:tooltipAction={'importItemToWorld'}
   >
      <i class={IMPORT_ICON}></i>
   </button>
{/if}
