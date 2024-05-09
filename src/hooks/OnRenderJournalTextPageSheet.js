import getSetting from '~/helpers/utility-functions/GetSetting.js';

export default function onRenderJournalTextPageSheet(journalSheet, html) {
   // If dark mode journals are enabled, add the titan dark mode class
   if (getSetting('darkModeJournals')) {
      const journal = html.find('journal-entry').prevObject;
      journal.addClass('titan-dark-mode');
   }
}
