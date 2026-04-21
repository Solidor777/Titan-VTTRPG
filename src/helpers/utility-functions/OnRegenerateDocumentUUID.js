import ConfirmRegenerateUUIDDialog from '~/document/dialog/ConfirmRegenerateUUIDDialog.js';
import confirmRegenerateUUID from '~/helpers/Settings/ConfirmRegenerateUUID.js';
import regenerateDocumentUUID from '~/helpers/utility-functions/RegenerateDocumentUUID.js';

/**
 * Called when the user chooses to regenerate a random UUID for an actor or item.
 * This identifier is used for easy lookup during macro calls, but when duplicating an item, it can be useful to change
 * the UUID.
 * If the Confirm Regenerate UUID is true in the game settings, will bring up a dialog to confirm
 * regeneration.
 * @param {TitanActor|TitanItem} document - The Actor or Item to generate a new UUID for.
 * @returns {Application|void} The rendered dialog instance, if a valid document was provided.
 */
export default function onRegenerateDocumentUUID(document) {
   if (document) {

      // If the system is set to confirm the UUID regeneration, then bring up a.
      // dialog.
      if (confirmRegenerateUUID()) {
         return new ConfirmRegenerateUUIDDialog(document).render(true);
      }

      // Otherwise, immediately regenerate the UUID.
      else {
         return regenerateDocumentUUID(document);
      }
   }
}
