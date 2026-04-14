<script>
   import { SETTINGS_ICON } from '~/system/Icons.js';
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type {TitanDocumentSheet} Document Sheet Reference. */
   const application = getApplication();

   /** Opens a dialog to configure this sheet. */
   async function configureSheet() {
      const dialogOptions = application.getDialogRenderOptions();
      dialogOptions.document = application.document;
      return new foundry.applications.apps.DocumentSheetConfig(dialogOptions).render(true);
   }
</script>

<!--Edit Token Button-->
<button class="header-control icon configure-sheet-button"
        on:click={() => configureSheet()}
        use:tooltipAction={'openSheetConfigurator'}>
   <i class={SETTINGS_ICON}/>
</button>
