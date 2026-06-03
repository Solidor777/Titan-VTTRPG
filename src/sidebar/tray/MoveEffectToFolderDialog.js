import TitanDialog from '~/helpers/dialogs/Dialog.js';
import localize from '~/helpers/utility-functions/Localize.js';
import MoveEffectToFolderDialogShell from '~/sidebar/tray/MoveEffectToFolderDialogShell.svelte';

/**
 * @class MoveEffectToFolderDialog
 * @extends {TitanDialog}
 * A dialog that lets the user move a tray effect into one of the selected pack's folders, or back to
 * the pack root. Mounts a Svelte folder-picker and commits the choice through the tray state.
 */
export default class MoveEffectToFolderDialog extends TitanDialog {

   /**
    * Builds the folder-picker dialog for a single effect.
    * @param {object} effect - The ActiveEffect document being relocated.
    * @param {import('~/sidebar/tray/EffectTrayState.svelte.js').default} trayState - The tray state
    * providing the folder list and the move operation.
    */
   constructor(effect, trayState) {
      /** @type {{ value: string, label: string }[]} The folder options, root first then by name. */
      const folderOptions = [
         { value: '', label: localize('effectTrayRoot') },
         ...[...trayState.folders]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((folder) => ({ value: folder.id, label: folder.name })),
      ];

      super({
         title: localize('effectTrayMoveToFolder'),
         content: {
            class: MoveEffectToFolderDialogShell,
            props: {
               effectName: effect.name,
               folderOptions,
               initialValue: effect.folder?.id ?? '',
            },
         },
         id: 'titan-move-effect-to-folder-dialog',
      });

      /**
       * Commits the chosen folder (empty string means the pack root) through the tray state.
       * @param {string} folderId - The selected folder id, or '' for the pack root.
       * @returns {Promise<void>}
       */
      this.confirmationCallback = (folderId) =>
         trayState.moveEffectToFolder(effect, folderId === '' ? null : folderId);
   }
}
