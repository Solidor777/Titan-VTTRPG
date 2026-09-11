import localize from '~/helpers/utility-functions/Localize.js';
import ExportDialog from '~/spreadsheet/ui/ExportDialog.js';
import ImportDialog from '~/spreadsheet/ui/ImportDialog.js';

/** @type {string[]} Document types the spreadsheet export/import tool supports. */
const SUPPORTED_PACK_TYPES = [
   'Actor',
   'Item',
   'ActiveEffect'
];

/**
 * Resolves the CompendiumCollection for a compendium-directory entry element.
 * @param {HTMLElement} li - The directory entry element (carries `data-pack`).
 * @returns {CompendiumCollection|undefined} The resolved pack, if any.
 */
function getPack(li) {
   return game.packs.get(li.dataset.pack ?? li.closest('[data-pack]')?.dataset.pack);
}

/**
 * Whether the spreadsheet entries are shown for a compendium-directory element: GM only, and only on a
 * pack whose document type the tool supports.
 * @param {HTMLElement} li - The directory entry element (carries `data-pack`).
 * @returns {boolean} True when the entry should be visible.
 */
function isSpreadsheetPackVisible(li) {
   if (!game.user.isGM) {
      return false;
   }
   /** @type {CompendiumCollection|undefined} */
   const pack = getPack(li);
   return Boolean(pack) && SUPPORTED_PACK_TYPES.includes(pack.metadata.type);
}

/**
 * Adds "Export to spreadsheet…" and "Import spreadsheet…" entries to a compendium's context menu.
 * @param {ApplicationV2} _application - The CompendiumDirectory instance (unused).
 * @param {object[]} options - Array of ContextMenuEntry objects to be mutated.
 */
export default function onGetCompendiumContextOptions(_application, options) {
   options.push({
      label: localize('exportToSpreadsheet'),
      icon: '<i class="fas fa-file-export"></i>',
      visible: isSpreadsheetPackVisible,
      onClick: (_event, li) => new ExportDialog(getPack(li)).render(true),
   });

   options.push({
      label: localize('importSpreadsheet'),
      icon: '<i class="fas fa-file-import"></i>',
      visible: isSpreadsheetPackVisible,
      onClick: (_event, li) => new ImportDialog(getPack(li) ?? null).render(true),
   });
}
