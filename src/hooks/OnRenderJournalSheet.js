import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Called before a Journal Sheet is rendered to add the dark mode class if appropriate.
 * @param {JournalSheet} journalSheet - The Journal Sheet being rendered.
 * @param {Element} element - The Element of the Journal Sheet being rendered.
 */
export default function onRenderJournalSheet(journalSheet, element) {
   // If dark mode journals are enabled, add the titan dark mode class
   if (getSetting('darkModeJournals')) {
      const journal = element.find('journal-entry').prevObject;
      journal.addClass('titan-dark-mode');
   }
}