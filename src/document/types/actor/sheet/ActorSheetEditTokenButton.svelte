<script>
   import { EDIT_TOKEN_ICON } from '~/system/Icons.js';
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {TitanActorSheet} Actor Sheet Reference. */
   const application = getApplication();

   /** Opens a dialog to edit this sheet's Token. */
   async function editToken() {
      // If this actor is unlinked, use the token sheet.
      if (application.token) {
         return application.token.sheet.render(application.getDialogRenderOptions());
      }

      // If this actor is linked, used the prototype token sheet.
      else {
         return new CONFIG.Token.prototypeSheetClass({ prototype: application.actor.prototypeToken }).render(
            application.getDialogRenderOptions());
      }
   }
</script>

<!--Edit Token Button-->
<button class="header-control icon edit-token-button"
        on:click={() => editToken()}
        use:tooltipAction={
           (application.token?.actorLink
           || application.token === null && $document.prototypeToken?.actorLink)
        ? 'editLinkedToken.desc'
        : 'editUnlinkedToken.desc'}>
   <i class={EDIT_TOKEN_ICON}/>
</button>
