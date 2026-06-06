import { describe, it, expect } from 'vitest';
import EmbeddedDocument from '~/document/reactive/EmbeddedDocument.svelte.js';

/**
 * Builds a stub parent bridge whose `.data` / `.doc` expose fake embedded collections, mirroring the
 * accessor shape of ReactiveDocument without any Svelte reactivity.
 * @returns {object} The stub fixture: `{ parent, weapon, effect }`.
 */
function makeParent() {
   /** @type {object} A fake embedded weapon document. */
   const weapon = {
      id: 'w1',
      system: {
         attack: [{ damage: 3 }],
      },
   };

   /** @type {object} A fake embedded effect document. */
   const effect = {
      id: 'e1',
      system: {
         duration: 2,
      },
   };

   /** @type {object} The fake parent document shape shared by both accessors. */
   const docShape = {
      items: new Map([['w1', weapon]]),
      effects: new Map([['e1', effect]]),
   };

   return {
      parent: {
         data: docShape,
         doc: docShape,
      },
      weapon,
      effect,
   };
}

describe('EmbeddedDocument', () => {
   it('resolves an embedded item by id through the parent reactive accessor', () => {
      const { parent, weapon } = makeParent();
      const bridge = new EmbeddedDocument(parent, 'items', 'w1');
      expect(bridge.data).toBe(weapon);
   });

   it('resolves an embedded effect by id through the parent reactive accessor', () => {
      const { parent, effect } = makeParent();
      const bridge = new EmbeddedDocument(parent, 'effects', 'e1');
      expect(bridge.data).toBe(effect);
   });

   it('exposes the raw document through .doc for write-back call sites', () => {
      const { parent, weapon } = makeParent();
      const bridge = new EmbeddedDocument(parent, 'items', 'w1');
      expect(bridge.doc).toBe(weapon);
   });

   it('returns undefined safely for a missing id', () => {
      const { parent } = makeParent();
      const bridge = new EmbeddedDocument(parent, 'items', 'nope');
      expect(bridge.data).toBeUndefined();
      expect(bridge.doc).toBeUndefined();
   });

   it('returns undefined safely when the parent resolves to nothing', () => {
      const empty = {
         data: undefined,
         doc: undefined,
      };
      const bridge = new EmbeddedDocument(empty, 'items', 'w1');
      expect(bridge.data).toBeUndefined();
      expect(bridge.doc).toBeUndefined();
   });

   it('chains through a nested EmbeddedDocument parent (effect on item on actor)', () => {
      const { parent, weapon } = makeParent();

      /** @type {object} A fake effect embedded on the weapon. */
      const weaponEffect = {
         id: 'we1',
         system: {
            duration: 5,
         },
      };
      weapon.effects = new Map([['we1', weaponEffect]]);

      const itemBridge = new EmbeddedDocument(parent, 'items', 'w1');
      const effectBridge = new EmbeddedDocument(itemBridge, 'effects', 'we1');
      expect(effectBridge.data).toBe(weaponEffect);
      expect(effectBridge.doc).toBe(weaponEffect);
   });

   it('re-resolves on every read so a replaced document is never stale', () => {
      const { parent } = makeParent();
      const bridge = new EmbeddedDocument(parent, 'items', 'w1');

      /** @type {object} A replacement document with the same id (identity changes on update). */
      const replacement = {
         id: 'w1',
         system: {
            attack: [{ damage: 9 }],
         },
      };
      parent.data.items.set('w1', replacement);
      expect(bridge.data).toBe(replacement);
   });

   it('destroy() is a safe no-op (the ancestor bridge owns the hooks)', () => {
      const { parent } = makeParent();
      const bridge = new EmbeddedDocument(parent, 'items', 'w1');
      expect(() => bridge.destroy()).not.toThrow();
   });
});
