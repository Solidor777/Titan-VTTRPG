import localize from '~/helpers/utility-functions/Localize.js';
import onRegenerateDocumentUUID from '~/helpers/utility-functions/OnRegenerateDocumentUUID.js';
import onEditDocumentUUID from '~/helpers/utility-functions/OnEditDocumentUUID.js';
import { ID_ICON } from '~/system/Icons.js';

/**
 * Generates contextual options when right-clicking on an Item in the Items directory.
 * In Foundry v14 the hook signature is (application, menuItems); each ContextMenuEntry uses
 * `visible(li)` and `onClick(event, li)` where `li` is the target HTMLElement.
 * @param {ApplicationV2} _application - The ApplicationV2 instance the context menu belongs to.
 * @param {object[]} options - Array of ContextMenuEntry objects to be mutated.
 */
export default function onGetItemDirectoryEntryContext(_application, options) {

   // Regenerate UUID.
   options.push({
      name: localize('regenerateUUID'),
      icon: `<i class="${ID_ICON}"></i>`,
      visible: (li) => isItemOwner(li),
      onClick: (_event, li) => onRegenerateDocumentUUID(getItem(li)),
   });

   // Edit UUID.
   options.push({
      name: localize('editUUID'),
      icon: `<i class="${ID_ICON}"></i>`,
      visible: (li) => isItemOwner(li),
      onClick: (_event, li) => onEditDocumentUUID(getItem(li)),
   });
}

/**
 * Gets the Item from an Entry in the Items directory.
 * In v14 directory items carry the document id in data-entry-id on the li element itself.
 * @param {HTMLElement} li - The li HTMLElement for the Document in the directory.
 * @returns {TitanItem} The Document from the Entry in the directory.
 */
function getItem(li) {
   return game.items.get(li.closest('[data-entry-id]')?.dataset.entryId);
}

/**
 * Determines whether the current user owns the Item for an Entry in the Items directory.
 * @param {HTMLElement} li - The li HTMLElement for the Document in the directory.
 * @returns {boolean} Whether the current user owns the Document for an Entry in the directory.
 */
function isItemOwner(li) {
   return getItem(li)?.isOwner;
}
