<script>
   import { getContext } from 'svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import { SEND_TO_CHAT_ICON } from '~/system/Icons.js';
   import localize from '~/helpers/utility-functions/Localize.js';

   /** @type {object} The embedded item bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');
</script>

<IconButton
   icon={SEND_TO_CHAT_ICON}
   label={localize('sendToChat')}
   onclick={() => document.doc?.sendToChat()}
   tooltip={'sendToChat'}
/>
