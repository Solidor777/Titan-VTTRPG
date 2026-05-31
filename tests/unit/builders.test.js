import { describe, it, expect } from 'vitest';
import { buildPlayerActorData, buildFlatModifierItemData } from '../shared/builders.js';
import { FLAT_MODIFIER } from '../shared/fixtureConstants.js';

describe('fixture builders', () => {
   it('builds a player actor create-payload', () => {
      const data = buildPlayerActorData('E2E Player Fixture');
      expect(data).toEqual({ name: 'E2E Player Fixture', type: 'player' });
   });

   it('builds an item carrying a single flatModifier rules element', () => {
      const data = buildFlatModifierItemData('E2E Mod Item');
      expect(data.type).toBe('weapon');
      expect(data.name).toBe('E2E Mod Item');
      expect(data.system.rulesElement).toHaveLength(1);
      expect(data.system.rulesElement[0]).toMatchObject({
         operation: 'flatModifier',
         selector: FLAT_MODIFIER.selector,
         key: FLAT_MODIFIER.key,
         value: FLAT_MODIFIER.value,
      });
   });
});
