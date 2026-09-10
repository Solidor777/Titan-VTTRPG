import localize from '~/helpers/utility-functions/Localize.js';
import ImportDialog from '~/spreadsheet/ui/ImportDialog.js';

/**
 * Injects an "Import spreadsheet…" button into the Compendium sidebar tab's header for a GM. The exact
 * header-actions container selector is unverified against a live Foundry v14 client in this environment;
 * it falls back to the tab's outer `.directory-header` element if a dedicated actions row isn't found, so
 * it degrades to "button appended at the top of the header" rather than failing silently.
 * @param {ApplicationV2} _application - The CompendiumDirectory instance (unused).
 * @param {HTMLElement} element - The rendered sidebar tab's root element.
 */
export default function onRenderCompendiumDirectory(_application, element) {
   if (!game.user.isGM) {
      return;
   }
   /** @type {HTMLElement|null} */
   const controls =
      element.querySelector('.directory-header .header-actions') ?? element.querySelector('.directory-header');
   if (!controls || controls.querySelector('[data-action="titanImportSpreadsheet"]')) {
      return;
   }

   /** @type {HTMLButtonElement} */
   const button = document.createElement('button');
   button.type = 'button';
   button.dataset.action = 'titanImportSpreadsheet';
   button.dataset.testid = 'titan-import-spreadsheet-button';
   button.innerHTML = `<i class="fas fa-file-import"></i> ${localize('importSpreadsheet')}`;
   button.addEventListener('click', () => new ImportDialog(null).render(true));
   controls.appendChild(button);
}
