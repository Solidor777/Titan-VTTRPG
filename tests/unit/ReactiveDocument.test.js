import { describe, it, expect } from 'vitest';
import { flushSync } from 'svelte';
import { render, screen } from '@testing-library/svelte';
import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';
import DocumentProbe from '../components/DocumentProbe.svelte';

/**
 * Renders the probe reader against a bridge around a fake document.
 * @param {object} doc - The fake document to bridge.
 * @returns {void}
 */
function renderBridge(doc) {
   render(DocumentProbe, {
      context: new Map([[
         'document',
         new ReactiveDocument(doc),
      ]]),
   });
}

describe('ReactiveDocument', () => {
   it('re-renders a reader when the wrapped document updates', () => {
      const doc = {
         id: 'a1',
         uuid: 'Actor.a1',
         documentName: 'Actor',
         system: { value: 1 },
      };
      renderBridge(doc);
      expect(screen.getByTestId('value').textContent).toBe('1');

      // Mutate the live document and fire the corresponding update hook.
      doc.system.value = 2;
      Hooks.call('updateActor', doc, {}, {});
      flushSync();

      expect(screen.getByTestId('value').textContent).toBe('2');
   });

   it('ignores the update of another document that shares its id but not its uuid', () => {
      // A token's synthetic actor carries its base actor's id and has its own uuid.
      const doc = {
         id: 'a1',
         uuid: 'Actor.a1',
         documentName: 'Actor',
         system: { value: 1 },
      };
      const sibling = {
         id: 'a1',
         uuid: 'Scene.s1.Token.t1.Actor.a1',
         documentName: 'Actor',
         system: { value: 1 },
      };
      renderBridge(doc);

      // The live document changes without a hook; only an invalidation makes the reader read it again.
      doc.system.value = 2;
      Hooks.call('updateActor', sibling, {}, {});
      flushSync();
      expect(screen.getByTestId('value').textContent).toBe('1');

      Hooks.call('updateActor', doc, {}, {});
      flushSync();
      expect(screen.getByTestId('value').textContent).toBe('2');
   });

   it('re-renders for an embedded document of the wrapped document and ignores one of a sibling sharing its id', () => {
      const doc = {
         id: 'a1',
         uuid: 'Actor.a1',
         documentName: 'Actor',
         system: { value: 1 },
      };
      const sibling = {
         id: 'a1',
         uuid: 'Scene.s1.Token.t1.Actor.a1',
         documentName: 'Actor',
         system: { value: 1 },
      };
      const siblingItem = {
         id: 'i1',
         uuid: 'Scene.s1.Token.t1.Actor.a1.Item.i1',
         documentName: 'Item',
         parent: sibling,
      };
      const ownItem = {
         id: 'i2',
         uuid: 'Actor.a1.Item.i2',
         documentName: 'Item',
         parent: doc,
      };
      const ownItemEffect = {
         id: 'e1',
         uuid: 'Actor.a1.Item.i2.ActiveEffect.e1',
         documentName: 'ActiveEffect',
         parent: ownItem,
      };
      const siblingItemEffect = {
         id: 'e2',
         uuid: 'Scene.s1.Token.t1.Actor.a1.Item.i1.ActiveEffect.e2',
         documentName: 'ActiveEffect',
         parent: siblingItem,
      };
      renderBridge(doc);

      // Each change below happens without a hook; only an invalidation makes the reader read it.
      doc.system.value = 2;
      Hooks.call('updateItem', siblingItem, {}, {});
      Hooks.call('updateActiveEffect', siblingItemEffect, {}, {});
      flushSync();
      expect(screen.getByTestId('value').textContent).toBe('1');

      Hooks.call('updateItem', ownItem, {}, {});
      flushSync();
      expect(screen.getByTestId('value').textContent).toBe('2');

      doc.system.value = 3;
      Hooks.call('updateActiveEffect', ownItemEffect, {}, {});
      flushSync();
      expect(screen.getByTestId('value').textContent).toBe('3');
   });
});
