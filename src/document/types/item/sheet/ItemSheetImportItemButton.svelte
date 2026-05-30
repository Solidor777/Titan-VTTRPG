<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import { IMPORT_ICON } from '~/system/Icons.js';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Imports the item from a compendium sheet.
    * @returns {Promise<Document>} The imported Document.
    */
   async function importItem() {
      return document.data.collection.importFromCompendium(document.data.compendium, document.data.id);
   }
</script>

<!--Import Item Button-->
<button aria-label={localize('importItem')}
        class="header-control icon edit-token-button"
        onclick={() => importItem()}
        use:tooltipAction={'importItemToWorld'}>
   <i class={IMPORT_ICON}></i>
</button>
