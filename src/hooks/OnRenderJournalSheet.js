import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Called before a Journal Sheet is rendered to add the dark mode class if appropriate.
 * @param {JournalSheet} journalSheet - The Journal Sheet being rendered.
 * @param {Node} html - The DOM element of the Journal Sheet being rendered.
 */
export default function onRenderJournalSheet(journalSheet, html) {
   // If dark mode journals are enabled, add the titan dark mode class
   if (getSetting('darkModeJournals')) {
      const journal = html.find('journal-entry').prevObject;
      journal.addClass('titan-dark-mode');
   }
}