import darkModeJournals from '~/helpers/Settings/DarkModeJournals.js';

/**
 * Called when a Journal Entry Page ProseMirror Sheet is rendered to add the dark mode class if appropriate.
 * In Foundry v14 the hook signature is (application, element, context, options) where element
 * is an HTMLElement; the class is applied directly to the root element.
 * @param {ApplicationV2} _application - The JournalEntryPageProseMirrorSheet ApplicationV2 instance.
 * @param {HTMLElement} element - The root HTMLElement of the rendered Journal Text Page Sheet.
 */
export default function onRenderJournalTextPageSheet(_application, element) {
   // If dark mode journals are enabled, add the titan dark mode class directly to the root element.
   if (darkModeJournals()) {
      element.classList.add('titan-dark-mode');
   }
}
