import { describe, it, expect } from 'vitest';
import { flushSync, tick } from 'svelte';
import { render, screen } from '@testing-library/svelte';
import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';
import DocumentProbe from '../components/DocumentProbe.svelte';

/**
 * Renders the probe reader against a bridge around a fake document.
 * @param {object} doc - The fake document to bridge.
 * @returns {object} The render result, which unmounts the probe.
 */
function renderBridge(doc) {
   return render(DocumentProbe, {
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

describe('ReactiveDocument and the ownership of an ancestor', () => {
   /**
    * Builds an actor, a sibling actor that shares its id, and an item of the first.
    * @returns {{actor: object, sibling: object, item: object}} The fake documents.
    */
   function createDocuments() {
      const actor = {
         id: 'a1',
         uuid: 'Actor.a1',
         documentName: 'Actor',
      };
      const sibling = {
         id: 'a1',
         uuid: 'Scene.s1.Token.t1.Actor.a1',
         documentName: 'Actor',
      };
      const item = {
         id: 'i1',
         uuid: 'Actor.a1.Item.i1',
         documentName: 'Item',
         parent: actor,
         system: { value: 1 },
      };
      return {
         actor,
         sibling,
         item,
      };
   }

   it('re-renders a reader of an embedded document when its parent actor changes ownership', () => {
      const { actor, item } = createDocuments();
      renderBridge(item);

      // The change happens without a hook; only an invalidation makes the reader read the item again.
      item.system.value = 2;
      Hooks.call('updateActor', actor, { ownership: { u1: 2 } }, {});
      flushSync();
      expect(screen.getByTestId('value').textContent).toBe('2');
   });

   it('ignores an update of the parent that does not change ownership', () => {
      const { actor, item } = createDocuments();
      renderBridge(item);
      item.system.value = 2;
      Hooks.call('updateActor', actor, { name: 'Renamed' }, {});
      flushSync();
      expect(screen.getByTestId('value').textContent).toBe('1');
   });

   it('ignores an ownership change of another actor that shares the parent\'s id', () => {
      const { sibling, item } = createDocuments();
      renderBridge(item);
      item.system.value = 2;
      Hooks.call('updateActor', sibling, { ownership: { u1: 2 } }, {});
      flushSync();
      expect(screen.getByTestId('value').textContent).toBe('1');
   });
});

describe('ReactiveDocument and the ownership sources of a document', () => {
   /**
    * Counts the hook handlers registered on the mock.
    * @returns {number} The number of registered handlers across all hooks.
    */
   function countHandlers() {
      return Object.values(Hooks.handlers).reduce((total, handlers) => total + handlers.size, 0);
   }

   /**
    * Builds an unlinked token's synthetic actor with an item, the token, the base actor, and an unrelated actor.
    * @returns {{base: object, unrelated: object, synthetic: object, item: object}} The fake documents.
    */
   function createTokenDocuments() {
      const base = {
         id: 'a1',
         uuid: 'Actor.a1',
         documentName: 'Actor',
      };
      const token = {
         id: 't1',
         uuid: 'Scene.s1.Token.t1',
         documentName: 'Token',
         baseActor: base,
         parent: {
            id: 's1',
            uuid: 'Scene.s1',
            documentName: 'Scene',
         },
      };
      const synthetic = {
         id: 'a1',
         uuid: 'Scene.s1.Token.t1.Actor.a1',
         documentName: 'Actor',
         parent: token,
         system: { value: 1 },
      };
      const item = {
         id: 'i1',
         uuid: 'Scene.s1.Token.t1.Actor.a1.Item.i1',
         documentName: 'Item',
         parent: synthetic,
         system: { value: 1 },
      };
      const unrelated = {
         id: 'a2',
         uuid: 'Actor.a2',
         documentName: 'Actor',
      };
      return {
         base,
         unrelated,
         synthetic,
         item,
      };
   }

   it('re-renders a reader of an effect on an item on an actor when the actor changes ownership', () => {
      const actor = {
         id: 'a1',
         uuid: 'Actor.a1',
         documentName: 'Actor',
      };
      const item = {
         id: 'i1',
         uuid: 'Actor.a1.Item.i1',
         documentName: 'Item',
         parent: actor,
      };
      const effect = {
         id: 'e1',
         uuid: 'Actor.a1.Item.i1.ActiveEffect.e1',
         documentName: 'ActiveEffect',
         parent: item,
         system: { value: 1 },
      };
      renderBridge(effect);
      effect.system.value = 2;
      Hooks.call('updateItem', item, { ownership: { u1: 2 } }, {});
      flushSync();
      expect(screen.getByTestId('value').textContent, 'the parent item is a source').toBe('2');
      effect.system.value = 3;
      Hooks.call('updateActor', actor, { ownership: { u1: 2 } }, {});
      flushSync();
      expect(screen.getByTestId('value').textContent, 'the grandparent actor is a source').toBe('3');
   });

   it('re-renders for an update whose only ownership change is the default level', () => {
      const actor = {
         id: 'a1',
         uuid: 'Actor.a1',
         documentName: 'Actor',
      };
      const item = {
         id: 'i1',
         uuid: 'Actor.a1.Item.i1',
         documentName: 'Item',
         parent: actor,
         system: { value: 1 },
      };
      renderBridge(item);
      item.system.value = 2;
      Hooks.call('updateActor', actor, { ownership: { default: 2 } }, {});
      flushSync();
      expect(screen.getByTestId('value').textContent).toBe('2');
   });

   it('re-renders for an ownership change of an update that applied no diff', () => {
      const actor = {
         id: 'a1',
         uuid: 'Actor.a1',
         documentName: 'Actor',
      };
      const item = {
         id: 'i1',
         uuid: 'Actor.a1.Item.i1',
         documentName: 'Item',
         parent: actor,
         system: { value: 1 },
      };
      renderBridge(item);
      item.system.value = 2;
      Hooks.call('updateActor', actor, { ownership: { u1: 2 } }, { diff: false });
      flushSync();
      expect(screen.getByTestId('value').textContent).toBe('2');
   });

   it('removes every hook it registered when its reader unmounts', async () => {
      const { item } = createTokenDocuments();
      const { unmount } = renderBridge(item);
      expect(countHandlers(), 'the reader registered handlers').toBeGreaterThan(0);
      unmount();
      await tick();
      expect(countHandlers(), 'no handler is left').toBe(0);
   });

   it('re-renders a reader of a token actor\'s item when the base actor changes ownership', () => {
      const { base, item } = createTokenDocuments();
      renderBridge(item);
      item.system.value = 2;
      Hooks.call('updateActor', base, { ownership: { u1: 2 } }, {});
      flushSync();
      expect(screen.getByTestId('value').textContent).toBe('2');
   });

   it('re-renders a reader of a token actor when the base actor changes ownership', () => {
      const { base, synthetic } = createTokenDocuments();
      renderBridge(synthetic);
      synthetic.system.value = 2;
      Hooks.call('updateActor', base, { ownership: { u1: 2 } }, {});
      flushSync();
      expect(screen.getByTestId('value').textContent).toBe('2');
   });

   it('ignores an ownership change of an unrelated actor and a non-ownership update of the base actor', () => {
      const { base, unrelated, item } = createTokenDocuments();
      renderBridge(item);
      item.system.value = 2;
      Hooks.call('updateActor', unrelated, { ownership: { u1: 2 } }, {});
      Hooks.call('updateActor', base, { name: 'Renamed' }, {});
      flushSync();
      expect(screen.getByTestId('value').textContent).toBe('1');
   });

   it('re-renders a reader of a chat message when the actor that spoke changes ownership', () => {
      const speaker = {
         id: 'a1',
         uuid: 'Actor.a1',
         documentName: 'Actor',
      };
      const message = {
         id: 'm1',
         uuid: 'ChatMessage.m1',
         documentName: 'ChatMessage',
         speaker: { actor: 'a1' },
         constructor: { getSpeakerActor: () => speaker },
         system: { value: 1 },
      };
      renderBridge(message);
      message.system.value = 2;
      Hooks.call('updateActor', speaker, { ownership: { u1: 2 } }, {});
      flushSync();
      expect(screen.getByTestId('value').textContent).toBe('2');
   });

   it('re-renders a reader of a chat message when the base actor of the speaking token actor changes ownership', () => {
      const { base, synthetic } = createTokenDocuments();
      const message = {
         id: 'm1',
         uuid: 'ChatMessage.m1',
         documentName: 'ChatMessage',
         speaker: {
            scene: 's1',
            token: 't1',
         },
         constructor: { getSpeakerActor: () => synthetic },
         system: { value: 1 },
      };
      renderBridge(message);
      message.system.value = 2;
      Hooks.call('updateActor', base, { ownership: { u1: 2 } }, {});
      flushSync();
      expect(screen.getByTestId('value').textContent).toBe('2');
   });
});

describe('ReactiveDocument and the compendium configuration', () => {
   it('re-renders a reader of a compendium document when the compendium configuration setting changes', () => {
      const item = {
         id: 'i1',
         uuid: 'Compendium.pack.items.Item.i1',
         documentName: 'Item',
         pack: 'pack.items',
         system: { value: 1 },
      };
      renderBridge(item);
      item.system.value = 2;
      Hooks.call('updateSetting', { key: 'core.somethingElse' }, {}, {});
      flushSync();
      expect(screen.getByTestId('value').textContent, 'another setting is ignored').toBe('1');
      Hooks.call('updateSetting', { key: 'core.compendiumConfiguration' }, {}, {});
      flushSync();
      expect(screen.getByTestId('value').textContent).toBe('2');
   });

   it('registers no setting hook for a document outside a compendium', () => {
      const item = {
         id: 'i1',
         uuid: 'Item.i1',
         documentName: 'Item',
         pack: null,
         system: { value: 1 },
      };
      renderBridge(item);
      expect(Hooks.handlers.updateSetting?.size ?? 0).toBe(0);
   });
});
