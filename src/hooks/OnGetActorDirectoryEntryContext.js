import localize from '~/helpers/utility-functions/Localize.js';
import onRegenerateDocumentUUID from '~/helpers/utility-functions/OnRegenerateDocumentUUID.js';
import onEditDocumentUUID from '~/helpers/utility-functions/OnEditDocumentUUID.js';
import { ID_ICON } from '~/system/Icons.js';

/**
 * Generates contextual options when right-clicking on an Actor in the Actors directory.
 * In Foundry v14 the hook signature is (application, menuItems); each ContextMenuEntry uses
 * `visible(li)` and `onClick(event, li)` where `li` is the target HTMLElement.
 * @param {ApplicationV2} _application - The ApplicationV2 instance the context menu belongs to.
 * @param {object[]} options - Array of ContextMenuEntry objects to be mutated.
 */
export default function onGetActorDirectoryEntryContext(_application, options) {

   // Regenerate UUID.
   options.push({
      label: localize('regenerateUUID'),
      icon: `<i class="${ID_ICON}"></i>`,
      visible: (li) => isActorOwner(li),
      onClick: (_event, li) => onRegenerateDocumentUUID(getActorFromDirectoryEntry(li)),
   });

   // Edit UUID.
   options.push({
      label: localize('editUUID'),
      icon: `<i class="${ID_ICON}"></i>`,
      visible: (li) => isActorOwner(li),
      onClick: (_event, li) => onEditDocumentUUID(getActorFromDirectoryEntry(li)),
   });
}

/**
 * Gets the Actor from an Entry in the Actors directory.
 * In v14 directory items carry the document id in data-entry-id on the li element itself.
 * @param {HTMLElement} li - The li HTMLElement for the Document in the directory.
 * @returns {TitanActor} The Document from the Entry in the directory.
 */
function getActorFromDirectoryEntry(li) {
   return game.actors.get(li.closest('[data-entry-id]')?.dataset.entryId);
}

/**
 * Determines whether the current user owns the Actor for an Entry in the Actors directory.
 * @param {HTMLElement} li - The li HTMLElement for the Document in the directory.
 * @returns {boolean} Whether the current user owns the Document for an Entry in the directory.
 */
function isActorOwner(li) {
   return getActorFromDirectoryEntry(li)?.isOwner;
}
