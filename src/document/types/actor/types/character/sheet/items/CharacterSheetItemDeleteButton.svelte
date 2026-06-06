<script>
   import { getContext } from 'svelte';
   import { DELETE_ICON } from '~/system/Icons.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import DocumentOwnerIconButton from '~/document/svelte-components/DocumentOwnerIconButton.svelte';

   /** @type {object} The embedded item bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The owning sheet's actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');
</script>

<DocumentOwnerIconButton
   icon={DELETE_ICON}
   label={localize('deleteItem')}
   onclick={() => sheetDocument.data.system.requestItemDeletion(document.data?._id)}
   tooltip={'deleteItem'}
/>
