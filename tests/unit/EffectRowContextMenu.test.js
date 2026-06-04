import { beforeEach, describe, expect, it } from 'vitest';
import buildEffectRowContextMenu from '../../src/sidebar/tray/EffectRowContextMenu.js';

describe('buildEffectRowContextMenu', () => {
   beforeEach(() => {
      // localize() resolves `LOCAL.${key}.text`; mock i18n to echo the key for readable assertions.
      globalThis.game = { i18n: { localize: (key) => key } };
   });

   it('lists the six entries in order with localized labels', () => {
      /** @type {object} A fake tray state: editable pack that supports folders. */
      const trayState = { canEdit: true, selectedPack: { folders: {} } };
      /** @type {object[]} The built context-menu entries. */
      const entries = buildEffectRowContextMenu(trayState, () => {});
      expect(entries.map((entry) => entry.label)).toEqual([
         'LOCAL.effectTrayApply.text',
         'LOCAL.effectTrayOpen.text',
         'LOCAL.effectTrayRename.text',
         'LOCAL.effectTrayMoveToFolder.text',
         'LOCAL.effectTrayDuplicate.text',
         'LOCAL.effectTrayDelete.text',
      ]);
   });

   it('shows Apply and Open always, but gates edit actions behind canEdit', () => {
      /** @type {object} A fake tray state: not editable. */
      const trayState = { canEdit: false, selectedPack: { folders: {} } };
      /** @type {object[]} The built context-menu entries. */
      const entries = buildEffectRowContextMenu(trayState, () => {});
      /** @type {(label: string) => boolean} Resolves an entry's visibility by label. */
      const visibleOf = (label) => entries.find((entry) => entry.label === label).visible();
      expect(visibleOf('LOCAL.effectTrayApply.text')).toBe(true);
      expect(visibleOf('LOCAL.effectTrayOpen.text')).toBe(true);
      expect(visibleOf('LOCAL.effectTrayRename.text')).toBe(false);
      expect(visibleOf('LOCAL.effectTrayDuplicate.text')).toBe(false);
      expect(visibleOf('LOCAL.effectTrayDelete.text')).toBe(false);
   });

   it('hides Move to Folder when the pack has no folder support', () => {
      /** @type {object} A fake tray state: editable but folderless pack. */
      const trayState = { canEdit: true, selectedPack: { folders: null } };
      /** @type {object[]} The built context-menu entries. */
      const entries = buildEffectRowContextMenu(trayState, () => {});
      /** @type {object} The Move-to-Folder entry. */
      const move = entries.find((entry) => entry.label === 'LOCAL.effectTrayMoveToFolder.text');
      expect(move.visible()).toBe(false);
   });

   it('Move to Folder onClick invokes the injected opener with the resolved effect', () => {
      /** @type {object} The effect the menu resolves from the clicked row. */
      const effect = { id: 'abc' };
      /** @type {object} An editable, folder-capable tray state exposing the effect. */
      const trayState = { canEdit: true, selectedPack: { folders: {} }, effects: [effect] };
      /** @type {object[]} Effects captured by the injected opener spy. */
      const opened = [];
      /** @type {(effect: object) => void} The injected move-to-folder opener. */
      const openMoveToFolder = (resolved) => opened.push(resolved);

      /** @type {object[]} The built menu entries. */
      const entries = buildEffectRowContextMenu(trayState, openMoveToFolder);
      /** @type {object} The Move-to-Folder entry. */
      const move = entries.find((entry) => entry.label === 'LOCAL.effectTrayMoveToFolder.text');

      /** @type {HTMLElement} A fake row carrying the effect id read by resolveEffect. */
      const target = document.createElement('div');
      target.dataset.effectId = 'abc';

      move.onClick({}, target);
      expect(opened).toEqual([effect]);
   });

   it('Move to Folder onClick does not invoke the opener when the effect cannot be resolved', () => {
      /** @type {object} A tray state with no effects to resolve against. */
      const trayState = { canEdit: true, selectedPack: { folders: {} }, effects: [] };
      /** @type {number} How many times the injected opener was called. */
      let callCount = 0;
      /** @type {(effect: object) => void} The injected move-to-folder opener spy. */
      const openMoveToFolder = () => {
         callCount += 1;
      };

      /** @type {object[]} The built menu entries. */
      const entries = buildEffectRowContextMenu(trayState, openMoveToFolder);
      /** @type {object} The Move-to-Folder entry. */
      const move = entries.find((entry) => entry.label === 'LOCAL.effectTrayMoveToFolder.text');

      /** @type {HTMLElement} A row whose id is absent from trayState.effects. */
      const target = document.createElement('div');
      target.dataset.effectId = 'not-found';

      move.onClick({}, target);
      expect(callCount).toBe(0);
   });
});
