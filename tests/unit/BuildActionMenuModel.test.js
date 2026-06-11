import { describe, it, expect, vi } from 'vitest';
import buildActionMenuModel from '~/ui/player-hud/elements/action-menu/BuildActionMenuModel.js';
import { createDefaultHudOptions } from '~/ui/player-hud/PlayerHudDefaults.js';

/**
 * Builds a mock character actor with spied engine methods.
 * @param {object} [overrides] - Replaces the stub's id, type, items, effects, or equipped map.
 * @returns {object} An actor stub whose engine methods are vi.fn spies.
 */
function mockActor(overrides = {}) {
   return {
      id: overrides.id ?? 'a1',
      type: overrides.type ?? 'player',
      items: overrides.items ?? [],
      effects: overrides.effects ?? [],
      system: {
         equipped: overrides.equipped ?? { armor: null, shield: null },
         requestAttributeCheck: vi.fn(),
         requestResistanceCheck: vi.fn(),
         requestAttackCheck: vi.fn(),
         requestItemCheck: vi.fn(),
         requestCastingCheck: vi.fn(),
         toggleEquipped: vi.fn(),
         spendResolve: vi.fn(),
         shortRest: vi.fn(),
         longRest: vi.fn(),
         removeCombatEffects: vi.fn(),
         toggleInspiration: vi.fn(),
         requestEffectDeletion: vi.fn(),
      },
   };
}

/**
 * Builds a mock item.
 * @param {object} fields - Seeds the stub's id, type, name, and system pieces.
 * @returns {object} An item stub with spied sendToChat/sheet/update entry points.
 */
function mockItem(fields) {
   return {
      id: fields.id,
      type: fields.type,
      name: fields.name ?? fields.id,
      img: 'icons/svg/item-bag.svg',
      sendToChat: vi.fn(),
      sheet: { render: vi.fn() },
      update: vi.fn(),
      system: {
         attack: fields.attack ?? [],
         check: fields.check ?? [],
         equipped: fields.equipped ?? false,
         quantity: fields.quantity,
         ...fields.system,
      },
   };
}

/**
 * Finds a category by key.
 * @param {Array<object>} model - The built model to search.
 * @param {string} key - The category key to look up.
 * @returns {object | undefined} The matching category, when present.
 */
function category(model, key) {
   return model.find((entry) => entry.key === key);
}

describe('buildActionMenuModel', () => {
   it('always offers 18 skills, 3 resistances, and utility for a single character', () => {
      const model = buildActionMenuModel({ actors: [mockActor()], primary: mockActor(), options: createDefaultHudOptions().actionMenu });
      expect(category(model, 'skills').subOptions).toHaveLength(18);
      expect(category(model, 'resistances').subOptions).toHaveLength(3);
      expect(category(model, 'utility').subOptions.map((s) => s.key)).toEqual([
         'toggleInspiration', 'shortRest', 'longRest', 'removeCombatEffects',
         'applyDamage', 'applyHealing', 'applyRend', 'applyRepairs',
      ]);
   });

   it('limits group mode (2+ actors) to skills, resistances, and utility', () => {
      const actors = [mockActor({ id: 'a' }), mockActor({ id: 'b' })];
      const model = buildActionMenuModel({ actors, primary: actors[0], options: createDefaultHudOptions().actionMenu });
      expect(model.map((entry) => entry.key)).toEqual(['skills', 'resistances', 'utility']);
   });

   it('rolls a skill for every actor with the default attribute', () => {
      const actors = [mockActor({ id: 'a' }), mockActor({ id: 'b' })];
      const model = buildActionMenuModel({ actors, primary: actors[0], options: createDefaultHudOptions().actionMenu });
      category(model, 'skills').subOptions.find((s) => s.key === 'athletics').mainAction();
      for (const actor of actors) {
         expect(actor.system.requestAttributeCheck)
            .toHaveBeenCalledWith({ attribute: 'default', skill: 'athletics' });
      }
   });

   it('omits inspiration from utility when no actor is a player', () => {
      const npc = mockActor({ type: 'npc' });
      const model = buildActionMenuModel({ actors: [npc], primary: npc, options: createDefaultHudOptions().actionMenu });
      expect(category(model, 'utility').subOptions.some((s) => s.key === 'toggleInspiration')).toBe(false);
   });

   it('weapon main action: equipped with attacks attacks first; unequipped equips', () => {
      const equipped = mockItem({ id: 'w1', type: 'weapon', equipped: true, attack: [{ label: 'Slash' }] });
      const unequipped = mockItem({ id: 'w2', type: 'weapon', equipped: false, attack: [{ label: 'Stab' }] });
      const actor = mockActor({ items: [equipped, unequipped] });
      const model = buildActionMenuModel({ actors: [actor], primary: actor, options: createDefaultHudOptions().actionMenu });
      const weapons = category(model, 'weapons').subOptions;
      weapons.find((s) => s.key === 'w1').mainAction();
      expect(actor.system.requestAttackCheck).toHaveBeenCalledWith({ itemId: 'w1', attackIdx: 0 });
      weapons.find((s) => s.key === 'w2').mainAction();
      expect(actor.system.toggleEquipped).toHaveBeenCalledWith('w2');
   });

   it('weapon main action: equipped without attacks rolls the first check, else opens the sheet', () => {
      const checker = mockItem({ id: 'w3', type: 'weapon', equipped: true, check: [{ label: 'Parry' }] });
      const bare = mockItem({ id: 'w4', type: 'weapon', equipped: true });
      const actor = mockActor({ items: [checker, bare] });
      const options = createDefaultHudOptions().actionMenu;
      options.filters.weaponsWithActions = false;
      const model = buildActionMenuModel({ actors: [actor], primary: actor, options });
      const weapons = category(model, 'weapons').subOptions;
      weapons.find((s) => s.key === 'w3').mainAction();
      expect(actor.system.requestItemCheck).toHaveBeenCalledWith({ itemId: 'w3', checkIdx: 0 });
      weapons.find((s) => s.key === 'w4').mainAction();
      expect(bare.sheet.render).toHaveBeenCalledWith(true);
   });

   it('weapons filter hides weapons without attacks or checks; disabling it shows them', () => {
      const bare = mockItem({ id: 'w5', type: 'weapon' });
      const actor = mockActor({ items: [bare] });
      const options = createDefaultHudOptions().actionMenu;
      expect(buildActionMenuModel({ actors: [actor], primary: actor, options })
         .some((entry) => entry.key === 'weapons')).toBe(false);
      options.filters.weaponsWithActions = false;
      expect(category(buildActionMenuModel({ actors: [actor], primary: actor, options }), 'weapons')
         .subOptions).toHaveLength(1);
   });

   it('inventory main action: unequipped equippable equips; commodity rolls first check; else sheet', () => {
      const armor = mockItem({ id: 'i1', type: 'armor', check: [{ label: 'X' }] });
      const commodity = mockItem({ id: 'i2', type: 'commodity', quantity: 2, check: [{ label: 'Y' }] });
      const plain = mockItem({ id: 'i3', type: 'equipment', equipped: true });
      const actor = mockActor({ items: [armor, commodity, plain] });
      const options = createDefaultHudOptions().actionMenu;
      options.filters.inventoryWithChecks = false;
      const model = buildActionMenuModel({ actors: [actor], primary: actor, options });
      const inventory = category(model, 'inventory').subOptions;
      inventory.find((s) => s.key === 'i1').mainAction();
      expect(actor.system.toggleEquipped).toHaveBeenCalledWith('i1');
      inventory.find((s) => s.key === 'i2').mainAction();
      expect(actor.system.requestItemCheck).toHaveBeenCalledWith({ itemId: 'i2', checkIdx: 0 });
      inventory.find((s) => s.key === 'i3').mainAction();
      expect(plain.sheet.render).toHaveBeenCalledWith(true);
   });

   it('commodity sub-buttons adjust quantity and floor at zero', () => {
      const commodity = mockItem({ id: 'i4', type: 'commodity', quantity: 0, check: [{ label: 'Y' }] });
      const actor = mockActor({ items: [commodity] });
      const model = buildActionMenuModel({ actors: [actor], primary: actor, options: createDefaultHudOptions().actionMenu });
      const sub = category(model, 'inventory').subOptions.find((s) => s.key === 'i4');
      sub.subButtons.find((b) => b.key === 'quantity-increase').action();
      expect(commodity.update).toHaveBeenCalledWith({ system: { quantity: 1 } });
      sub.subButtons.find((b) => b.key === 'quantity-decrease').action();
      expect(commodity.update).toHaveBeenCalledWith({ system: { quantity: 0 } });
   });

   it('spell main action requests the casting check', () => {
      const spell = mockItem({ id: 's1', type: 'spell' });
      const actor = mockActor({ items: [spell] });
      const model = buildActionMenuModel({ actors: [actor], primary: actor, options: createDefaultHudOptions().actionMenu });
      category(model, 'spells').subOptions[0].mainAction();
      expect(actor.system.requestCastingCheck).toHaveBeenCalledWith({ itemId: 's1' });
   });

   it('effect sub-options roll via itemRollData and offer duration/remove sub-buttons', () => {
      const effect = {
         id: 'e1',
         type: 'effect',
         name: 'Burning',
         img: 'x.svg',
         getRollData: vi.fn(() => ({ rolled: true })),
         sendToChat: vi.fn(),
         sheet: { render: vi.fn() },
         update: vi.fn(),
         system: { check: [{ label: 'C' }], duration: { type: 'turnStart', remaining: 2 } },
      };
      const actor = mockActor({ effects: [effect] });
      const model = buildActionMenuModel({ actors: [actor], primary: actor, options: createDefaultHudOptions().actionMenu });
      const sub = category(model, 'effects').subOptions[0];
      sub.mainAction();
      expect(actor.system.requestItemCheck).toHaveBeenCalledWith({ itemRollData: { rolled: true }, checkIdx: 0 });
      sub.subButtons.find((b) => b.key === 'duration-increase').action();
      expect(effect.update).toHaveBeenCalledWith({ system: { duration: { remaining: 3 } } });
      sub.subButtons.find((b) => b.key === 'remove').action();
      expect(actor.system.requestEffectDeletion).toHaveBeenCalledWith('e1');
   });

   it('per-category and per-sub-button-type disables prune the model', () => {
      const weapon = mockItem({ id: 'w6', type: 'weapon', equipped: true, attack: [{ label: 'A' }] });
      const actor = mockActor({ items: [weapon] });
      const options = createDefaultHudOptions().actionMenu;
      options.categories.skills = false;
      options.subButtons.sendToChat = false;
      const model = buildActionMenuModel({ actors: [actor], primary: actor, options });
      expect(model.some((entry) => entry.key === 'skills')).toBe(false);
      const sub = category(model, 'weapons').subOptions[0];
      expect(sub.subButtons.some((b) => b.key === 'send-to-chat')).toBe(false);
   });
});
