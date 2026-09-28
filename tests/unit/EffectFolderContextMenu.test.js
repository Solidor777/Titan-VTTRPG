import { beforeEach, describe, expect, it, vi } from 'vitest';
import buildEffectFolderContextMenu from '../../src/sidebar/tray/EffectFolderContextMenu.js';

/**
 * Builds a fake folder-header target inside a folder element carrying `data-folder-id`.
 * @param {string} folderId - The folder id on the enclosing element.
 * @returns {{ target: object, header: object }} The target the menu receives and the header it resolves.
 */
function headerTarget(folderId) {
   /** @type {object} The fake header, recording dispatched events. */
   const header = { dispatchEvent: vi.fn() };
   return {
      header,
      target: {
         closest: (selector) => {
            if (selector === '[data-folder-id]') {
               return { dataset: { folderId } };
            }
            if (selector === '.directory-item') {
               return { offsetTop: 120 };
            }
            return selector === '.folder-header' ? header : null;
         },
      },
   };
}

/**
 * Builds a fake tray state whose selected pack holds one folder under id `f1`.
 * @param {boolean} canEdit - Whether the selected pack is editable.
 * @returns {{ trayState: object, folder: object }} The tray state and the folder it holds.
 */
function fakeTrayState(canEdit) {
   /** @type {object} The Active Effect folder the menu resolves from the header. */
   const folder = {
      type: 'ActiveEffect',
      sheet: { render: vi.fn() },
   };
   return {
      folder,
      trayState: {
         canEdit,
         requestCreateTableFromFolder: vi.fn(),
         requestDeleteFolderAll: vi.fn(),
         requestRemoveFolder: vi.fn(),
         selectedPack: {
            folders: new Map([[
               'f1',
               folder,
            ]]),
         },
      },
   };
}

describe('buildEffectFolderContextMenu', () => {
   beforeEach(() => {
      // localize() resolves `LOCAL.${key}.text`; mock i18n to echo the key for readable assertions.
      globalThis.game = { i18n: { localize: (key) => key } };
      globalThis.window = {
         innerHeight: 1000,
         innerWidth: 1920,
      };
      globalThis.CONFIG = { RollTable: { sidebarIcon: 'fa-solid fa-table-list' } };
      globalThis.CONST = {
         COMPENDIUM_DOCUMENT_TYPES: [
            'ActiveEffect',
            'Item',
         ],
      };
      globalThis.CustomEvent = class {
         /**
          * Records the event type.
          * @param {string} type - The event type.
          */
         constructor(type) {
            this.type = type;
         }
      };
   });

   it('lists the core compendium folder entries in core order, with Rename after Edit Folder', () => {
      /** @type {object[]} The built context-menu entries. */
      const entries = buildEffectFolderContextMenu(fakeTrayState(true).trayState);
      expect(entries.map((entry) => entry.label)).toEqual([
         'FOLDER.Edit',
         'LOCAL.effectTrayRenameFolder.text',
         'FOLDER.CreateTable',
         'FOLDER.Remove',
         'FOLDER.Delete',
      ]);
   });

   it('omits the entries the core Compendium directory removes from folder menus', () => {
      /** @type {string[]} The built entry labels. */
      const labels = buildEffectFolderContextMenu(fakeTrayState(true).trayState).map((entry) => entry.label);
      expect(labels).not.toContain('OWNERSHIP.Configure');
      expect(labels).not.toContain('FOLDER.Export');
   });

   it('shows every entry on an editable pack', () => {
      const { trayState } = fakeTrayState(true);
      const { target } = headerTarget('f1');
      expect(buildEffectFolderContextMenu(trayState).map((entry) => entry.visible(target))).toEqual([
         true,
         true,
         true,
         true,
         true,
      ]);
   });

   it('shows only Create Rollable Table when the pack is not editable', () => {
      const { trayState } = fakeTrayState(false);
      const { target } = headerTarget('f1');
      expect(buildEffectFolderContextMenu(trayState).map((entry) => entry.visible(target))).toEqual([
         false,
         false,
         true,
         false,
         false,
      ]);
   });

   it('Edit opens the resolved folder configuration', () => {
      const { trayState, folder } = fakeTrayState(true);
      const [edit] = buildEffectFolderContextMenu(trayState);
      edit.onClick(null, headerTarget('f1').target);
      expect(folder.sheet.render).toHaveBeenCalledWith(true);
   });

   it('Create Rollable Table, Remove Folder, and Delete All route the folder with the core dialog position', () => {
      const { trayState, folder } = fakeTrayState(true);
      const [, , createTable, remove, deleteAll] = buildEffectFolderContextMenu(trayState);
      const { target } = headerTarget('f1');
      createTable.onClick(null, target);
      remove.onClick(null, target);
      deleteAll.onClick(null, target);
      expect(trayState.requestCreateTableFromFolder).toHaveBeenCalledWith(folder, {
         top: 120,
         left: 1180,
      });
      expect(trayState.requestRemoveFolder).toHaveBeenCalledWith(folder, {
         top: 120,
         left: 1150,
      });
      expect(trayState.requestDeleteFolderAll).toHaveBeenCalledWith(folder, {
         top: 120,
         left: 1150,
      });
   });

   it('folder actions no-op when the header resolves no folder', () => {
      const { trayState } = fakeTrayState(true);
      const [, , createTable, remove, deleteAll] = buildEffectFolderContextMenu(trayState);
      const { target } = headerTarget('missing');
      createTable.onClick(null, target);
      remove.onClick(null, target);
      deleteAll.onClick(null, target);
      expect(createTable.visible(target)).toBe(false);
      expect(trayState.requestCreateTableFromFolder).not.toHaveBeenCalled();
      expect(trayState.requestRemoveFolder).not.toHaveBeenCalled();
      expect(trayState.requestDeleteFolderAll).not.toHaveBeenCalled();
   });

   it('Rename dispatches the inline-rename event on the folder header', () => {
      const [, rename] = buildEffectFolderContextMenu(fakeTrayState(true).trayState);
      const { target, header } = headerTarget('f1');
      rename.onClick(null, target);
      expect(header.dispatchEvent).toHaveBeenCalledTimes(1);
      expect(header.dispatchEvent.mock.calls[0][0].type).toBe('titan-folder-rename');
   });
});
