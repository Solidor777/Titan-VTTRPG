import localize from '~/helpers/utility-functions/Localize.js';
import TitanDialog from '~/helpers/dialogs/Dialog.js';
import ImportDialogShell from '~/spreadsheet/ui/ImportDialogShell.svelte';

/**
 * Dialog for importing a spreadsheet file into an existing or new compendium: choose files, a target
 * pack (or a new one), whether to delete pack documents absent from the file, preview the resulting
 * plan, then apply it.
 * @extends {TitanDialog}
 */
export default class ImportDialog extends TitanDialog {

   /**
    * Builds the dialog window, preselecting a target pack when opened from that pack's context menu.
    * @param {CompendiumCollection|null} initialPack - The preselected target pack, or null.
    */
   constructor(initialPack) {
      super({
         title: localize('importSpreadsheet'),
         content: {
            class: ImportDialogShell,
            props: { initialPack },
         },
         id: `import-spreadsheet-dialog-${initialPack?.collection ?? 'new'}`,
      });
   }

   /**
    * Wider default size than the base dialog, to fit the file picker and preview table.
    * @override
    */
   static DEFAULT_OPTIONS = {
      position: {
         width: 480,
         height: 'auto',
      },
      window: {
         resizable: true,
         minimizable: false,
      },
   };
}
