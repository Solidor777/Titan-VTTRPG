import localize from '~/helpers/utility-functions/Localize.js';
import onRegenerateDocumentUUID from '~/helpers/utility-functions/OnRegenerateDocumentUUID.js';
import onEditDocumentUUID from '~/helpers/utility-functions/OnEditDocumentUUID.js';
import {ID_ICON} from '~/system/Icons.js';

/**
 * Generates contextual options when right-clicking on an Actor in the Actors directory.
 * @param {Element} element - The Element that was clicked.
 * @param {object} options - Array of buttons contenting the contextual options.
 */
export default function onGetActorDirectoryEntryContext(element, options) {

   // Regenerate UUID
   options.push({
      name: localize('regenerateUUID'),
      icon: `<i class="${ID_ICON}"></i>`,
      condition: isActorOwner,
      callback: (entry) => onRegenerateDocumentUUID(getActorFromDirectoryEntry(entry)),
   });

   // Edit UUID
   options.push({
      name: localize('editUUID'),
      icon: `<i class="${ID_ICON}"></i>`,
      condition: isActorOwner,
      callback: (entry) => onEditDocumentUUID(getActorFromDirectoryEntry(entry)),
   });
}

/**
 * Gets the Actor from an Entry in the Actors directory.
 * @param {Element} element - Element Entry for the Document in the directory.
 * @returns {TitanActor} The Document from the Entry in the directory.
 */
function getActorFromDirectoryEntry(element) {
   return game.actors.get(element.data('document-id'));
}

/**
 * Determines whether the current user owns the Actor for an Entry in the Actors directory.
 * @param {Element} element - Element Entry for the Document in the directory.
 * @returns {boolean} Whether the current user owns the Document for an Entry in the directory.
 */
function isActorOwner(element) {
   return getActorFromDirectoryEntry(element)?.isOwner;
}
