<script>
   import { LINKED_ICON } from '~/system/Icons.js';
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type TitanActorSheet Actor Sheet Reference. */
   const application = getApplication();

   /** Unlinks this Actor from their Token. */
   async function unlinkToken() {
      // Unlink the actor
      const token = application.token;
      await token.update({ actorLink: false });

      // Close this actor and open the new actor sheet
      const newToken = application.token;
      await application.close();
      newToken.actor.sheet.render({ force: true });
   }
</script>

<!--Unlink Button-->
<button class="header-control icon unlink-token-button"
        on:click={() => unlinkToken()}
        use:tooltipAction={'unlinkTokenButton.desc'}>
   <i class="linked {LINKED_ICON}"/>
</button>

<style lang="scss">
   .linked {
      color: darkorange;
      text-shadow: 0 0 8px darkorange;
   }
</style>
