import localize from '~/helpers/utility-functions/Localize.js';
import TitanDialog from '~/helpers/dialogs/Dialog.js';
import ExportDialogShell from '~/spreadsheet/ui/ExportDialogShell.svelte';

/**
 * Dialog offering format (xlsx/csv) and layout (wide/relational) choices, then exporting a compendium
 * pack to a downloaded spreadsheet file.
 * @extends {TitanDialog}
 */
export default class ExportDialog extends TitanDialog {

   /**
    * Builds the dialog window and passes the target pack to the export shell component.
    * @param {CompendiumCollection} pack - The pack to export.
    */
   constructor(pack) {
      super({
         title: `${localize('exportToSpreadsheet')} (${pack.metadata.label})`,
         content: {
            class: ExportDialogShell,
            props: { pack },
         },
         id: `export-spreadsheet-dialog-${pack.collection}`,
      });
   }
}
