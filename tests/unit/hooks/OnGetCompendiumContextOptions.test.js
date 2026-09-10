import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ExportDialog/ImportDialog transitively import Dialog.js, which reads foundry.applications.api at
// module-evaluation time; the dialog shells are mocked and the module is imported dynamically inside each
// test (after beforeEach sets up the stub) rather than statically, matching ExportDialog.test.js /
// ImportDialog.test.js.
vi.mock('~/spreadsheet/ui/ExportDialogShell.svelte', () => ({ default: class {} }));
vi.mock('~/spreadsheet/ui/ImportDialogShell.svelte', () => ({ default: class {} }));

describe('onGetCompendiumContextOptions', () => {
   beforeEach(() => {
      globalThis.foundry.applications = { api: { ApplicationV2: class { constructor(o) { this.options = o; } } } };
      globalThis.game = {
         user: { isGM: true },
         packs: { get: (id) => (id === 'test.weapons' ? { metadata: { type: 'Item' } } : undefined) },
         // Localize.js unconditionally calls game.i18n.localize(`LOCAL.${key}.text`) with no raw-key
         // fallback, so a label assertion must match that exact prefixed/suffixed echo, not the bare key.
         i18n: { localize: (key) => key },
      };
   });

   afterEach(() => {
      delete globalThis.foundry.applications;
      delete globalThis.game;
   });

   it('adds an export entry visible only for a GM on a supported pack type', async () => {
      const { default: onGetCompendiumContextOptions } = await import('~/hooks/OnGetCompendiumContextOptions.js');
      /** @type {object[]} */
      const options = [];
      onGetCompendiumContextOptions({}, options);
      /** @type {object} */
      const exportEntry = options.find((o) => o.label === 'LOCAL.exportToSpreadsheet.text');
      /** @type {object} A pack li stand-in. */
      const li = { dataset: { pack: 'test.weapons' } };
      expect(exportEntry.visible(li)).toBe(true);

      globalThis.game.user.isGM = false;
      expect(exportEntry.visible(li)).toBe(false);
   });

   it('hides the export entry for an unsupported pack type', async () => {
      const { default: onGetCompendiumContextOptions } = await import('~/hooks/OnGetCompendiumContextOptions.js');
      globalThis.game.packs.get = () => ({ metadata: { type: 'RollTable' } });
      /** @type {object[]} */
      const options = [];
      onGetCompendiumContextOptions({}, options);
      /** @type {object} */
      const exportEntry = options.find((o) => o.label === 'LOCAL.exportToSpreadsheet.text');
      expect(exportEntry.visible({ dataset: { pack: 'test.weapons' } })).toBe(false);
   });

   it('adds an import entry visible for any GM regardless of pack type', async () => {
      const { default: onGetCompendiumContextOptions } = await import('~/hooks/OnGetCompendiumContextOptions.js');
      /** @type {object[]} */
      const options = [];
      onGetCompendiumContextOptions({}, options);
      /** @type {object} */
      const importEntry = options.find((o) => o.label === 'LOCAL.importSpreadsheet.text');
      expect(importEntry.visible({ dataset: { pack: 'test.weapons' } })).toBe(true);
   });
});
