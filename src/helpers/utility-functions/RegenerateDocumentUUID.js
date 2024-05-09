import localize from '~/helpers/utility-functions/Localize.js';
import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';

/**
 * Regenerates a random UUID for an actor or item.
 * This identifier is used for easy lookup during macro calls,
 * but when duplicating an item, it can be useful to change the UUID.
 * @param {TitanActor|TitanItem} document The Actor or Item to generate a new UUID for.
 * @returns {Promise<void>}               Returns after the UUID has been regenerated.
 */
export default async function regenerateDocumentUUID(document) {
   if (document) {
      await document.update({
         flags: {
            titan: {
               uuid: generateUUID(),
            },
         },
      });

      ui.notifications.info(
         localize('regeneratedUUIDForDocumentX%').replace('X%', document.name),
      );
   }
}
