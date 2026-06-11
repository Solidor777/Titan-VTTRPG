import { describe, it, expect } from 'vitest';
import resolveRollActor from '~/document/reactive/ResolveRollActor.js';

/**
 * Builds a fake character actor document whose system exposes the check-roll methods.
 * @param {object} [overrides] - Extra fields merged onto the actor doc.
 * @returns {object} A fake Actor document.
 */
function makeCharacterActor(overrides = {}) {
   return {
      documentName: 'Actor',
      system: {
         requestItemCheck() {},
      },
      ...overrides,
   };
}

/**
 * Wraps a fake doc in a minimal bridge shape ({ doc }) matching ReactiveDocument's accessor surface.
 * @param {object} doc - The fake document to wrap.
 * @returns {object} A stub bridge.
 */
function makeBridge(doc) {
   return { doc };
}

describe('resolveRollActor', () => {
   it('returns the same bridge for a character actor sheet', () => {
      const bridge = makeBridge(makeCharacterActor());
      expect(resolveRollActor(bridge)).toBe(bridge);
   });

   it('returns a parent-actor bridge for an owned item whose parent is a character', () => {
      const parent = makeCharacterActor();
      const bridge = makeBridge({
         documentName: 'Item',
         isEmbedded: true,
         isOwner: true,
         parent,
      });
      const result = resolveRollActor(bridge);
      expect(result).toBeDefined();
      expect(result.doc).toBe(parent);
   });

   it('returns undefined for an owned item when the user is not its owner', () => {
      const bridge = makeBridge({
         documentName: 'Item',
         isEmbedded: true,
         isOwner: false,
         parent: makeCharacterActor(),
      });
      expect(resolveRollActor(bridge)).toBeUndefined();
   });

   it('returns undefined for a world item (not embedded)', () => {
      const bridge = makeBridge({
         documentName: 'Item',
         isEmbedded: false,
         isOwner: true,
         parent: null,
      });
      expect(resolveRollActor(bridge)).toBeUndefined();
   });

   it('returns undefined for an owned item whose parent cannot roll checks', () => {
      const bridge = makeBridge({
         documentName: 'Item',
         isEmbedded: true,
         isOwner: true,
         parent: { documentName: 'Actor', system: {} },
      });
      expect(resolveRollActor(bridge)).toBeUndefined();
   });

   it('returns undefined for a non-character actor sheet', () => {
      const bridge = makeBridge({ documentName: 'Actor', system: {} });
      expect(resolveRollActor(bridge)).toBeUndefined();
   });

   it('returns undefined when given nothing', () => {
      expect(resolveRollActor(undefined)).toBeUndefined();
   });
});
