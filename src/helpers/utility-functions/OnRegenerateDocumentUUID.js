import ConfirmRegenerateUUIDDialog from '~/document/dialog/ConfirmRegenerateUUIDDialog.js';
import getSetting from '~/helpers/utility-functions/GetSetting.js';
import regenerateDocumentUUID from '~/helpers/utility-functions/RegenerateDocumentUUID.js';

/**
 * Called when the user chooses to regenerate a random UUID for an actor or item.
 * This identifier is used for easy lookup during macro calls,
 * but when duplicating an item, it can be useful to change the UUID.
 * If the Confirm Regenerate UUID is true in the game settings, will bring up a dialog to confirm regeneration.
 * @param {TitanActor|TitanItem} document - The Actor or Item to generate a new UUID for.
 * @returns {Application|void} The rendered dialog instance, if a valid document was provided.
 */
export default function onRegenerateDocumentUUID(document) {
   if (document) {

      // If the system is set confirm the UUID regeneration, then bring up a dialog
      if (getSetting('confirmRegenerateUUID')) {
         return new ConfirmRegenerateUUIDDialog(document).render(true);
      }

      // Otherwise, immediately regeneration the UUID
      else {
         return regenerateDocumentUUID(document);
      }
   }
}
