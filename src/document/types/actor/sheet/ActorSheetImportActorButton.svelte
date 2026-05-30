<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import { IMPORT_ICON } from '~/system/Icons.js';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** Imports the actor from a compendium sheet. */
   async function importActor() {
      return document.data.collection.importFromCompendium(document.data.compendium, document.data.id);
   }
</script>

<!--Import Actor Button-->
<button aria-label={localize('importActor')}
        class="header-control icon edit-token-button"
        onclick={() => importActor()}
        use:tooltipAction={'importActorToWorld'}>
   <i class={IMPORT_ICON}></i>
</button>
