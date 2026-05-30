import darkModeJournals from '~/helpers/Settings/DarkModeJournals.js';

/**
 * Called when a Journal Entry Sheet is rendered to add the dark mode class if appropriate.
 * In Foundry v14 the hook signature is (application, element, context, options) where element
 * is an HTMLElement; the application's root element already carries the 'journal-entry' CSS class.
 * @param {ApplicationV2} _application - The JournalEntrySheet ApplicationV2 instance.
 * @param {HTMLElement} element - The root HTMLElement of the rendered Journal Entry Sheet.
 */
export default function onRenderJournalSheet(_application, element) {
   // If dark mode journals are enabled, add the titan dark mode class directly to the root element.
   if (darkModeJournals()) {
      element.classList.add('titan-dark-mode');
   }
}
