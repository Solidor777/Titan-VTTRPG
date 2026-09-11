import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.hoisted(() => {
   // Stand-in for foundry.applications.api.ApplicationV2, destructured by ExportDialog at import time.
   globalThis.foundry.applications = { api: { ApplicationV2: class { constructor(o) { this.options = o; } } } };
   globalThis.game = { i18n: { localize: (key) => key } };
});

vi.mock('~/spreadsheet/ui/ExportDialogShell.svelte', () => ({ default: class {} }));

import ExportDialog from '~/spreadsheet/ui/ExportDialog.js';

beforeEach(() => {
   globalThis.foundry.applications = { api: { ApplicationV2: class { constructor(o) { this.options = o; } } } };
   globalThis.game = { i18n: { localize: (key) => key } };
});

afterEach(() => {
   delete globalThis.foundry.applications;
   delete globalThis.game;
});

describe('ExportDialog', () => {
   it('titles the dialog with the pack label and passes the pack to the shell', () => {
      /** @type {object} */
      const pack = { metadata: { label: 'Test Weapons' } };
      /** @type {object} */
      const dialog = new ExportDialog(pack);
      expect(dialog.options.window.title).toContain('Test Weapons');
      expect(dialog.content.props.pack).toBe(pack);
   });
});
