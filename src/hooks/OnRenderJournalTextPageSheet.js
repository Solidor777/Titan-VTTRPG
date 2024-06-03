import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Called before a Journal Text Page Sheet is rendered to add the dark mode class if appropriate.
 * @param {JournalSheet} journalSheet - The Journal Text Page Sheet being rendered.
 * @param {Node} html - The DOM element of the Journal Text Page Sheet being rendered.
 */
export default function onRenderJournalTextPageSheet(journalSheet, html) {
   // If dark mode journals are enabled, add the titan dark mode class
   if (getSetting('darkModeJournals')) {
      const journal = html.find('journal-entry').prevObject;
      journal.addClass('titan-dark-mode');
   }
}
