import localize from '~/helpers/utility-functions/Localize.js';
import { RENAME_ICON } from '~/system/Icons.js';

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
 * Builds the dialog position core's directory uses for its folder confirmations: level with the folder's
 * directory entry (clamped so the dialog fits the viewport) and offset left of the sidebar by a fixed width.
 * @param {HTMLElement} target - The folder header the menu was opened on.
 * @param {number} leftOffset - Pixels from the viewport's right edge to the dialog's left edge (core uses 740
 * for Create Rollable Table and 770 for Remove Folder and Delete All).
 * @returns {{top: number, left: number}} The dialog position.
 */
function getDialogPosition(target, leftOffset) {
   /** @type {HTMLElement | null} The folder's directory entry, whose offset core measures. */
   const entry = target?.closest('.directory-item');
   return {
      top: Math.min(entry?.offsetTop ?? 0, window.innerHeight - 350),
      left: window.innerWidth - leftOffset,
   };
}

/**
 * Builds the right-click context-menu entries for an effect-tray folder header, matching the folder menu
 * core's Compendium directory shows for a pack's folders (DocumentDirectory's folder entries less
 * Configure Ownership and Export to Compendium, which the Compendium directory removes), plus an inline
 * Rename after Edit Folder:
 * - Edit Folder opens the core folder configuration (name, color, sorting).
 * - Rename edits the name inline in the header.
 * - Create Rollable Table builds a world table from the folder's effects.
 * - Remove Folder deletes the folder and moves its contents up a level.
 * - Delete All deletes the folder, its subfolders, and every effect inside them.
 *
 * Every entry that changes the pack requires edit permission on the selected pack (owned and unlocked),
 * where core requires a GM and leaves the lock to the server. Create Rollable Table changes no pack data,
 * so it shows whenever core shows it: for every folder, since Active Effect is a compendium document type.
 * Entry shape matches the effect-row menu (`{ label, icon, visible(target), onClick(event, target) }`).
 * @param {import('~/sidebar/tray/EffectTrayState.svelte.js').default} trayState - Reactive tray state
 * read by the entries for permission gating, folder resolution, and the folder actions.
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
         label: game.i18n.localize('FOLDER.CreateTable'),
         icon: `<i class="${CONFIG.RollTable.sidebarIcon}"></i>`,
         visible: (target) => CONST.COMPENDIUM_DOCUMENT_TYPES.includes(resolveFolder(target, trayState)?.type),
         onClick: (event, target) => {
            /** @type {Folder | undefined} The folder for the clicked header. */
            const folder = resolveFolder(target, trayState);
            if (folder) {
               void trayState.requestCreateTableFromFolder(folder, getDialogPosition(target, 740));
            }
         },
      },
      {
         label: game.i18n.localize('FOLDER.Remove'),
         icon: '<i class="fa-solid fa-trash"></i>',
         visible: () => trayState.canEdit,
         onClick: (event, target) => {
            /** @type {Folder | undefined} The folder for the clicked header. */
            const folder = resolveFolder(target, trayState);
            if (folder) {
               void trayState.requestRemoveFolder(folder, getDialogPosition(target, 770));
            }
         },
      },
      {
         label: game.i18n.localize('FOLDER.Delete'),
         icon: '<i class="fa-solid fa-dumpster"></i>',
         visible: () => trayState.canEdit,
         onClick: (event, target) => {
            /** @type {Folder | undefined} The folder for the clicked header. */
            const folder = resolveFolder(target, trayState);
            if (folder) {
               void trayState.requestDeleteFolderAll(folder, getDialogPosition(target, 770));
            }
         },
      },
   ];
}
