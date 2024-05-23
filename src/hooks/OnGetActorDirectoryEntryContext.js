import localize from '~/helpers/utility-functions/Localize.js';
import onRegenerateDocumentUUID from '~/helpers/utility-functions/OnRegenerateDocumentUUID.js';
import onEditDocumentUUID from '~/helpers/utility-functions/OnEditDocumentUUID.js';
import { ID_ICON } from '~/system/Icons.js';

/**
 * @param html
 * @param options
 */
export default function onGetActorDirectoryEntryContext(html, options) {

   // Regenerate UUID
   options.push({
      name: localize('regenerateUUID'),
      icon: `<i class="${ID_ICON}"></i>`,
      condition: isActorOwner,
      callback: (li) => onRegenerateDocumentUUID(getActorFromDirectoryEntry(li)),
   });

   // Edit UUID
   options.push({
      name: localize('editUUID'),
      icon: `<i class="${ID_ICON}"></i>`,
      condition: isActorOwner,
      callback: (li) => onEditDocumentUUID(getActorFromDirectoryEntry(li)),
   });
}

/**
 * @param li
 */
function getActorFromDirectoryEntry(li) {
   return game.actors.get(li.data('document-id'));
}

/**
 * @param li
 */
function isActorOwner(li) {
   return getActorFromDirectoryEntry(li)?.isOwner;
}
