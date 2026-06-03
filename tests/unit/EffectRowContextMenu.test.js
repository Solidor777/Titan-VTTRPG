import { beforeEach, describe, expect, it } from 'vitest';
import buildEffectRowContextMenu from '../../src/sidebar/tray/EffectRowContextMenu.js';

describe('buildEffectRowContextMenu', () => {
   beforeEach(() => {
      // localize() resolves `LOCAL.${key}.text`; mock i18n to echo the key for readable assertions.
      globalThis.game = { i18n: { localize: (key) => key } };
   });

   it('lists the seven entries in order with localized labels', () => {
      /** @type {object} A fake tray state: editable pack that supports folders. */
      const trayState = { canEdit: true, selectedPack: { folders: {} } };
      /** @type {object[]} The built context-menu entries. */
      const entries = buildEffectRowContextMenu(trayState);
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
      const entries = buildEffectRowContextMenu(trayState);
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
      const entries = buildEffectRowContextMenu(trayState);
      /** @type {object} The Move-to-Folder entry. */
      const move = entries.find((entry) => entry.label === 'LOCAL.effectTrayMoveToFolder.text');
      expect(move.visible()).toBe(false);
   });
});
