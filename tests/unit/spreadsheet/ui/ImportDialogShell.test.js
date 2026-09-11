import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/svelte';

vi.hoisted(() => {
   // localize() and the preview/apply summaries route through game.i18n at module-evaluation time.
   globalThis.game = {
      i18n: {
         localize: (key) => key,
         format: (key) => key,
      },
      packs: Object.assign([], { get: () => undefined }),
   };
   globalThis.ui = { notifications: { error: vi.fn(), info: vi.fn() } };
});

vi.mock('~/spreadsheet/io/PlanImport.js', () => ({ planImport: vi.fn() }));
vi.mock('~/spreadsheet/io/ApplyImport.js', () => ({ applyImport: vi.fn() }));

import ImportDialogShell from '~/spreadsheet/ui/ImportDialogShell.svelte';
import { planImport } from '~/spreadsheet/io/PlanImport.js';

/** @type {object} The first stub pack offered by the target-pack Select. */
const packA = { collection: 'world.a', metadata: { type: 'Item', label: 'Pack A' } };
/** @type {object} The second stub pack offered by the target-pack Select. */
const packB = { collection: 'world.b', metadata: { type: 'Item', label: 'Pack B' } };

/**
 * Builds a stub ImportPlan with the given error count, matching the shape ImportDialogShell reads.
 * @returns {object} The stub plan.
 */
function makePlan() {
   return { packType: 'Item', creates: [], updates: [], deletes: [], errors: [] };
}

beforeEach(() => {
   globalThis.game = {
      i18n: {
         localize: (key) => key,
         format: (key) => key,
      },
      packs: Object.assign([packA, packB], { get: (id) => [packA, packB].find((p) => p.collection === id) }),
   };
   globalThis.ui = { notifications: { error: vi.fn(), info: vi.fn() } };
   planImport.mockReset();
});

afterEach(() => {
   cleanup();
   delete globalThis.game;
   delete globalThis.ui;
});

/**
 * Renders the shell with the given file already "selected" and previews once, leaving a plan in place.
 * @returns {Promise<void>} Resolves once the preview button click has settled.
 */
async function renderWithPreviewedPlan() {
   planImport.mockResolvedValue(makePlan());
   render(ImportDialogShell, { props: { initialPack: packA } });

   /** @type {HTMLInputElement} */
   const fileInput = screen.getByTestId('import-file-input');
   /** @type {File} */
   const file = new File(['x'], 'sheet.xlsx');
   Object.defineProperty(fileInput, 'files', { value: [file] });
   await fireEvent.change(fileInput);

   await fireEvent.click(screen.getByTestId('import-preview-button'));
   await expect.poll(() => {
      if (globalThis.ui.notifications.error.mock.calls.length > 0) {
         throw new Error(`notified error: ${JSON.stringify(globalThis.ui.notifications.error.mock.calls)}`);
      }
      return screen.queryByTestId('import-preview-summary');
   }).not.toBeNull();
}

describe('ImportDialogShell', () => {
   it('clears the computed plan (disabling Apply) when the target pack changes', async () => {
      await renderWithPreviewedPlan();
      expect(screen.getByTestId('import-apply-button')).not.toBeNull();

      /** @type {HTMLElement} */
      const targetPackSelect = screen.getByTestId('import-target-pack-select');
      await fireEvent.click(targetPackSelect);
      await fireEvent.click(screen.getByText('LOCAL.Pack B.text'));

      expect(screen.queryByTestId('import-apply-button')).toBeNull();
      expect(screen.queryByTestId('import-preview-summary')).toBeNull();
   });

   it('clears the computed plan (disabling Apply) when the delete-missing checkbox changes', async () => {
      await renderWithPreviewedPlan();
      expect(screen.getByTestId('import-apply-button')).not.toBeNull();

      await fireEvent.click(screen.getByTestId('import-delete-missing-checkbox'));

      expect(screen.queryByTestId('import-apply-button')).toBeNull();
      expect(screen.queryByTestId('import-preview-summary')).toBeNull();
   });
});
