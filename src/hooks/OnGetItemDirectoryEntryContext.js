import localize from '~/helpers/utility-functions/Localize.js';
import onRegenerateDocumentUUID from '~/helpers/utility-functions/OnRegenerateDocumentUUID.js';
import onEditDocumentUUID from '~/helpers/utility-functions/OnEditDocumentUUID.js';
import { ID_ICON } from '~/system/Icons.js';

/**
 * @param html
 * @param options
 */
export default function onGetItemDirectoryEntryContext(html, options) {

   // Regenerate UUID
   options.push({
      name: localize('regenerateUUID'),
      icon: `<i class="${ID_ICON}"></i>`,
      condition: isItemOwner,
      callback: (li) => onRegenerateDocumentUUID(getItem(li)),
   });

   // Edit UUID
   options.push({
      name: localize('editUUID'),
      icon: `<i class="${ID_ICON}"></i>`,
      condition: isItemOwner,
      callback: (li) => onEditDocumentUUID(getItem(li)),
   });
}

/**
 * @param li
 */
function getItem(li) {
   return game.items.get(li.data('document-id'));
}

/**
 * @param li
 */
function isItemOwner(li) {
   return getItem(li)?.isOwner;
}
