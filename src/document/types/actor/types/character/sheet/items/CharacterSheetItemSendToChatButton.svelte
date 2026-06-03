<script>
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import { SEND_TO_CHAT_ICON } from '~/system/Icons.js';
   import localize from '~/helpers/utility-functions/Localize.js';

   /**
    * @typedef {object} CharacterSheetItemSendToChatButtonProps
    * @property {Item} [item] The Item this button is for.
    */

   /** @type {CharacterSheetItemSendToChatButtonProps} */
   const { item = undefined } = $props();
</script>

<IconButton
   icon={SEND_TO_CHAT_ICON}
   label={localize('sendToChat')}
   onclick={() => item.sendToChat()}
   tooltip={'sendToChat'}
/>
