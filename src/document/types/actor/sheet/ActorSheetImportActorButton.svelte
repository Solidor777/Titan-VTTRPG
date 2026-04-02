<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import { IMPORT_ICON } from '~/system/Icons.js';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the Document store. */
   const document = getContext('document');

   /** Imports the actor from a compendium sheet. */
   async function importActor() {
      return $document.collection.importFromCompendium($document.compendium, $document.id);
   }
</script>

<!--Import Actor Button-->
<button class="header-control icon edit-token-button"
        on:click={() => importActor()}
        use:tooltipAction={'importActorToWorld'}>
   <i class={IMPORT_ICON}/>
</button>
