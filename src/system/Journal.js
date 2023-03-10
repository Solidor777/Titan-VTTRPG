import { getSetting } from '~/helpers/Utility';

export default function onRenderJournalSheet(journalSheet, html) {
   if (getSetting('darkModeJournals')) {
      const journal = html.find('journal-entry').prevObject;
      journal.addClass('titan-dark-mode');
   }

   return;
}