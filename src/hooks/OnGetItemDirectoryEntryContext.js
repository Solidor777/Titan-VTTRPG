import localize from '~/helpers/utility-functions/Localize.js';
import onRegenerateDocumentUUID from '~/helpers/utility-functions/OnRegenerateDocumentUUID.js';
import onEditDocumentUUID from '~/helpers/utility-functions/OnEditDocumentUUID.js';
import {ID_ICON} from '~/system/Icons.js';

/**
 * Generates contextual options when right-clicking on an Item in the Items directory.
 * @param {Element} element - The Element that was clicked.
 * @param {object} options - Array of buttons contenting the contextual options.
 */
export default function onGetItemDirectoryEntryContext(element, options) {

   // Regenerate UUID
   options.push({
      name: localize('regenerateUUID'),
      icon: `<i class="${ID_ICON}"></i>`,
      condition: isItemOwner,
      callback: (entry) => onRegenerateDocumentUUID(getItem(entry)),
   });

   // Edit UUID
   options.push({
      name: localize('editUUID'),
      icon: `<i class="${ID_ICON}"></i>`,
      condition: isItemOwner,
      callback: (entry) => onEditDocumentUUID(getItem(entry)),
   });
}

/**
 * Gets the Item from an Entry in the Items directory.
 * @param {Element} element - Element Entry for the Document in the directory.
 * @returns {TitanItem} The Document from the Entry in the directory.
 */
function getItem(element) {
   return game.items.get(element.data('document-id'));
}

/**
 * Determines whether the current user owns the Item for an Entry in the Items directory.
 * @param {Element} element - Element Entry for the Document in the directory.
 * @returns {boolean} Whether the current user owns the Document for an Entry in the directory.
 */
function isItemOwner(element) {
   return getItem(element)?.isOwner;
}
