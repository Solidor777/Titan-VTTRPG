<script>
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import { EDIT_ICON, SHEET_ICON } from '~/system/Icons.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';

   /** @type {object} The embedded item bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');
</script>

<IconButton
   icon={document.data?.isOwner ? EDIT_ICON : SHEET_ICON}
   label={localize(document.data?.isOwner ? 'editItem' : 'viewItemSheet')}
   onclick={() => document.doc?.sheet.render(true)}
   tooltip={document.data?.isOwner ? 'editItem' : 'viewItemSheet'}
/>
