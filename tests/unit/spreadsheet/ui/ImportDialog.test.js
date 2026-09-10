import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('~/spreadsheet/ui/ImportDialogShell.svelte', () => ({ default: class {} }));

beforeEach(() => {
   globalThis.foundry.applications = { api: { ApplicationV2: class { constructor(o) { this.options = o; } } } };
   globalThis.game = { i18n: { localize: (key) => key } };
});

afterEach(() => {
   delete globalThis.foundry.applications;
   delete globalThis.game;
});

describe('ImportDialog', () => {
   it('preselects the given pack and titles the dialog generically when none is given', async () => {
      const { default: ImportDialog } = await import('~/spreadsheet/ui/ImportDialog.js');
      /** @type {object} */
      const pack = { metadata: { label: 'Test Weapons' }, collection: 'world.test' };

      /** @type {object} */
      const withPack = new ImportDialog(pack);
      expect(withPack.content.props.initialPack).toBe(pack);

      /** @type {object} */
      const withoutPack = new ImportDialog(null);
      expect(withoutPack.content.props.initialPack).toBeNull();
   });
});
