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
            return selector === '.folder-header' ? header : null;
         },
      },
   };
}

describe('buildEffectFolderContextMenu', () => {
   beforeEach(() => {
      // localize() resolves `LOCAL.${key}.text`; mock i18n to echo the key for readable assertions.
      globalThis.game = { i18n: { localize: (key) => key } };
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

   it('lists Edit, Rename, and Delete in order', () => {
      /** @type {object[]} The built context-menu entries. */
      const entries = buildEffectFolderContextMenu({ canEdit: true });
      expect(entries.map((entry) => entry.label)).toEqual([
         'FOLDER.Edit',
         'LOCAL.effectTrayRenameFolder.text',
         'LOCAL.effectTrayDeleteFolder.text',
      ]);
   });

   it('shows no entry when the pack is not editable', () => {
      /** @type {object[]} The built context-menu entries. */
      const entries = buildEffectFolderContextMenu({ canEdit: false });
      expect(entries.map((entry) => entry.visible())).toEqual([
         false,
         false,
         false,
      ]);
   });

   it('Edit opens the resolved folder configuration and Delete deletes it through the tray state', () => {
      /** @type {object} The folder the menu resolves from the header. */
      const folder = { sheet: { render: vi.fn() } };
      /** @type {object} A fake tray state holding the folder in its selected pack. */
      const trayState = {
         canEdit: true,
         deleteFolder: vi.fn(),
         selectedPack: {
            folders: new Map([[
               'f1',
               folder,
            ]]),
         },
      };
      const [edit, , remove] = buildEffectFolderContextMenu(trayState);
      const { target } = headerTarget('f1');
      edit.onClick(null, target);
      remove.onClick(null, target);
      expect(folder.sheet.render).toHaveBeenCalledWith(true);
      expect(trayState.deleteFolder).toHaveBeenCalledWith(folder);
   });

   it('Rename dispatches the inline-rename event on the folder header', () => {
      const [, rename] = buildEffectFolderContextMenu({ canEdit: true });
      const { target, header } = headerTarget('f1');
      rename.onClick(null, target);
      expect(header.dispatchEvent).toHaveBeenCalledTimes(1);
      expect(header.dispatchEvent.mock.calls[0][0].type).toBe('titan-folder-rename');
   });
});
