import localize from '~/helpers/utility-functions/Localize.js';
import { DELETE_ICON, RENAME_ICON } from '~/system/Icons.js';

/**
 * Resolves the pack Folder for a context-menu target header from its enclosing `data-folder-id`.
 * @param {HTMLElement} target - The folder header the menu was opened on.
 * @param {import('~/sidebar/tray/EffectTrayState.svelte.js').default} trayState - Reactive tray state
 * providing the selected pack.
 * @returns {Folder | undefined} The matching folder, or undefined when not found.
 */
function resolveFolder(target, trayState) {
   /** @type {string | undefined} The folder id read off the enclosing folder element. */
   const id = target?.closest('[data-folder-id]')?.dataset?.folderId;
   return id ? trayState.selectedPack?.folders?.get(id) : void 0;
}

/**
 * Builds the right-click context-menu entries for an effect-tray folder header, following the core folder
 * menu: Edit Folder opens the core folder configuration (name, color, sorting), Rename edits the name
 * inline, and Delete removes the folder. Every entry requires edit permission on the selected pack. Entry
 * shape matches the effect-row menu (`{ label, icon, visible(target), onClick(event, target) }`).
 * @param {import('~/sidebar/tray/EffectTrayState.svelte.js').default} trayState - Reactive tray state
 * read by the entries for permission gating and folder resolution.
 * @returns {object[]} The ContextMenuEntry array.
 */
export default function buildEffectFolderContextMenu(trayState) {
   return [
      {
         label: game.i18n.localize('FOLDER.Edit'),
         icon: '<i class="fa-solid fa-edit"></i>',
         visible: () => trayState.canEdit,
         onClick: (event, target) => {
            resolveFolder(target, trayState)?.sheet?.render(true);
         },
      },
      {
         label: localize('effectTrayRenameFolder'),
         icon: `<i class="${RENAME_ICON}"></i>`,
         visible: () => trayState.canEdit,
         onClick: (event, target) => {
            // Bridge to the header's inline-rename UX via a custom event it listens for.
            target?.closest('.folder-header')
               ?.dispatchEvent(new CustomEvent('titan-folder-rename', { bubbles: false }));
         },
      },
      {
         label: localize('effectTrayDeleteFolder'),
         icon: `<i class="${DELETE_ICON}"></i>`,
         visible: () => trayState.canEdit,
         onClick: (event, target) => {
            /** @type {Folder | undefined} The folder for the clicked header. */
            const folder = resolveFolder(target, trayState);
            if (folder) {
               void trayState.deleteFolder(folder);
            }
         },
      },
   ];
}
