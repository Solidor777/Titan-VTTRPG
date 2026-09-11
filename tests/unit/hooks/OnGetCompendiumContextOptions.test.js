import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.hoisted(() => {
   // ExportDialog/ImportDialog transitively import Dialog.js, which reads foundry.applications.api at
   // module-evaluation time; establish the stand-in before the static import below evaluates that graph.
   globalThis.foundry.applications = { api: { ApplicationV2: class { constructor(o) { this.options = o; } } } };
});

vi.mock('~/spreadsheet/ui/ExportDialogShell.svelte', () => ({ default: class {} }));
vi.mock('~/spreadsheet/ui/ImportDialogShell.svelte', () => ({ default: class {} }));

import onGetCompendiumContextOptions from '~/hooks/OnGetCompendiumContextOptions.js';

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

   it('adds an export entry visible only for a GM on a supported pack type', () => {
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

   it('hides the export entry for an unsupported pack type', () => {
      globalThis.game.packs.get = () => ({ metadata: { type: 'RollTable' } });
      /** @type {object[]} */
      const options = [];
      onGetCompendiumContextOptions({}, options);
      /** @type {object} */
      const exportEntry = options.find((o) => o.label === 'LOCAL.exportToSpreadsheet.text');
      expect(exportEntry.visible({ dataset: { pack: 'test.weapons' } })).toBe(false);
   });

   it('adds an import entry visible only for a GM on a supported pack type', () => {
      /** @type {object[]} */
      const options = [];
      onGetCompendiumContextOptions({}, options);
      /** @type {object} */
      const importEntry = options.find((o) => o.label === 'LOCAL.importSpreadsheet.text');
      /** @type {object} A pack li stand-in. */
      const li = { dataset: { pack: 'test.weapons' } };
      expect(importEntry.visible(li)).toBe(true);

      globalThis.game.user.isGM = false;
      expect(importEntry.visible(li)).toBe(false);
   });

   it('hides the import entry for an unsupported pack type', () => {
      globalThis.game.packs.get = () => ({ metadata: { type: 'RollTable' } });
      /** @type {object[]} */
      const options = [];
      onGetCompendiumContextOptions({}, options);
      /** @type {object} */
      const importEntry = options.find((o) => o.label === 'LOCAL.importSpreadsheet.text');
      expect(importEntry.visible({ dataset: { pack: 'test.weapons' } })).toBe(false);
   });
});
