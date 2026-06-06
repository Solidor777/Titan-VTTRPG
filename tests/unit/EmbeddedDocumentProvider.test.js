import { describe, it, expect, vi } from 'vitest';
import { flushSync } from 'svelte';
import { render, screen } from '@testing-library/svelte';
import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';
import DocumentSheetShell from '~/document/sheet/DocumentSheetShell.svelte';
import ProviderHarness from '../components/ProviderHarness.svelte';
import EmbeddedProbe from '../components/EmbeddedProbe.svelte';

/**
 * Builds a fake actor document carrying one embedded weapon, shaped for ReactiveDocument's hook filters
 * (`documentName`, ids, and the embedded document's `parent` back-reference).
 * @returns {object} The fixture: `{ actorDoc, weapon }`.
 */
function makeActorWithWeapon() {
   /** @type {object} The fake actor document wrapped by the top-level bridge. */
   const actorDoc = {
      id: 'a1',
      documentName: 'Actor',
      system: {
         value: 'actor',
      },
   };

   /** @type {object} The fake embedded weapon (its `parent` drives the onEmbedded hook filter). */
   const weapon = {
      id: 'w1',
      documentName: 'Item',
      parent: actorDoc,
      system: {
         value: 1,
      },
   };
   actorDoc.items = new Map([['w1', weapon]]);

   return {
      actorDoc,
      weapon,
   };
}

describe('EmbeddedDocumentProvider', () => {
   it('shadows the document context with the embedded weapon while sheetDocument stays the actor', () => {
      const { actorDoc, weapon } = makeActorWithWeapon();
      const bridge = new ReactiveDocument(actorDoc);
      render(ProviderHarness, {
         props: { doc: weapon },
         context: new Map([
            ['document', bridge],
            ['sheetDocument', bridge],
         ]),
      });

      expect(screen.getByTestId('document-id').textContent).toBe('w1');
      expect(screen.getByTestId('sheet-document-id').textContent).toBe('a1');
   });

   it('re-renders an embedded reader when the embedded item updates through the ancestor bridge', () => {
      const { actorDoc, weapon } = makeActorWithWeapon();
      const bridge = new ReactiveDocument(actorDoc);
      render(ProviderHarness, {
         props: { doc: weapon },
         context: new Map([
            ['document', bridge],
            ['sheetDocument', bridge],
         ]),
      });
      expect(screen.getByTestId('document-value').textContent).toBe('1');

      // Mutate the embedded weapon and fire the embedded-update hook the ancestor bridge listens to.
      weapon.system.value = 2;
      Hooks.call('updateItem', weapon, {}, {});
      flushSync();

      expect(screen.getByTestId('document-value').textContent).toBe('2');
   });

   it('warns and yields a null-resolving bridge for an unsupported document type', () => {
      const { actorDoc } = makeActorWithWeapon();
      const bridge = new ReactiveDocument(actorDoc);

      // Warn.js touches the `ui` notification global; define it for this test only.
      /** @type {import('vitest').Mock} The ui-notification warn stub Warn.js calls before console.warn. */
      const notificationWarn = vi.fn();
      globalThis.ui = {
         notifications: {
            warn: notificationWarn,
         },
      };

      /** @type {import('vitest').MockInstance} Spy silencing console.warn while capturing its calls. */
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      try {
         /** @type {object} A document of a kind the provider does not support. */
         const stranger = {
            id: 's1',
            documentName: 'Scene',
         };
         render(ProviderHarness, {
            props: { doc: stranger },
            context: new Map([
               ['document', bridge],
               ['sheetDocument', bridge],
            ]),
         });

         expect(screen.getByTestId('document-id').textContent).toBe('missing');
         // Warn.js calls console.warn(prefixedMessage, restArgsArray) — pin the assertion to OUR warning.
         expect(consoleWarn).toHaveBeenCalledWith(
            expect.stringContaining('unsupported document type'),
            expect.anything(),
         );
         expect(notificationWarn).toHaveBeenCalledTimes(1);
      } finally {
         // Always restore the spy and drop the ui global, even when an assertion above fails.
         consoleWarn.mockRestore();
         delete globalThis.ui;
      }
   });
});

describe('DocumentSheetShell sheetDocument context', () => {
   it('sets both document and sheetDocument to the same top-level bridge', () => {
      const { actorDoc } = makeActorWithWeapon();
      const bridge = new ReactiveDocument(actorDoc);
      render(DocumentSheetShell, {
         props: {
            document: bridge,
            applicationState: {},
            shell: EmbeddedProbe,
         },
      });

      expect(screen.getByTestId('document-id').textContent).toBe('a1');
      expect(screen.getByTestId('sheet-document-id').textContent).toBe('a1');
   });
});
