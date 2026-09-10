import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('~/spreadsheet/ui/ExportDialogShell.svelte', () => ({ default: class {} }));

beforeEach(() => {
   globalThis.foundry.applications = { api: { ApplicationV2: class { constructor(o) { this.options = o; } } } };
   globalThis.game = { i18n: { localize: (key) => key } };
});

afterEach(() => {
   delete globalThis.foundry.applications;
   delete globalThis.game;
});

describe('ExportDialog', () => {
   it('titles the dialog with the pack label and passes the pack to the shell', async () => {
      const { default: ExportDialog } = await import('~/spreadsheet/ui/ExportDialog.js');
      /** @type {object} */
      const pack = { metadata: { label: 'Test Weapons' } };
      /** @type {object} */
      const dialog = new ExportDialog(pack);
      expect(dialog.options.window.title).toContain('Test Weapons');
      expect(dialog.content.props.pack).toBe(pack);
   });
});
