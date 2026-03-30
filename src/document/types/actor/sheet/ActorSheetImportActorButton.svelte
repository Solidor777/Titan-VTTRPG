<script>
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { IMPORT_ICON } from '~/system/Icons.js';
   import { getContext } from 'svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /** @type TitanActorSheet Actor Sheet Reference. */
   const application = getApplication();

   /** Imports the actor from a compendium sheet.. */
   async function importActor() {
      return $document.collection.importFromCompendium($document.compendium, $document.id);
   }
</script>

<!--Import Actor Button-->
<button class="header-control icon edit-token-button"
        on:click={() => importActor()}
        use:tooltipAction={localize('importActorToWorld')}>
   <i class="{IMPORT_ICON}"/>
</button>
