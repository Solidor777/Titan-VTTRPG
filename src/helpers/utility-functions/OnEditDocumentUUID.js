import EditUUIDDialog from '~/document/dialogs/EditUUIDDialog.js';

/**
 * Called when the user chooses to edit the UUID of an Actor or Item.
 * Creates a dialog to manually edit the UUID.
 * This identifier is used for easy lookup during macro calls,
 * but when duplicating an item, it can be useful to change the UUID.
 * @param {TitanActor|TitanItem} document - The Actor or Item to edit.
 * @returns {Application|void} The rendered dialog instance, if a valid document was provided.
 */
export default function onEditDocumentUUID(document) {
   if (document) {
      return new EditUUIDDialog(document).render(true);
   }
}
