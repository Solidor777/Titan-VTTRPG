import {
   ACCURACY_ICON,
   DECREMENT_ICON,
   DELETE_ICON,
   DICE_ICON,
   INCREMENT_ICON,
   MELEE_ICON,
   SEND_TO_CHAT_ICON,
   SHEET_ICON,
} from '~/system/Icons.js';

/** @type {Array<string>} The 18 skill keys, matching the character schema. */
export const HUD_SKILLS = [
   'arcana', 'athletics', 'deception', 'dexterity', 'diplomacy', 'engineering',
   'intimidation', 'investigation', 'lore', 'medicine', 'meleeWeapons', 'metaphysics',
   'nature', 'perception', 'performance', 'rangedWeapons', 'stealth', 'subterfuge',
];

/** @type {Array<string>} The resistance keys. */
export const HUD_RESISTANCES = ['reflexes', 'resilience', 'willpower'];

/** @type {Array<string>} Item types equipped via the character's toggleEquipped path. */
const EQUIPPABLE_TYPES = ['armor', 'shield', 'equipment'];

/** @type {string} Icon classes for the equip/unequip sub-button. */
const EQUIP_TOGGLE_ICON = 'fas fa-shield-halved';

/**
 * Tests whether an item is currently equipped for the given actor (armor/shield equip by id on
 * the character; weapons/equipment carry their own flag).
 * @param {object} actor - The owning actor.
 * @param {object} item - The item to test.
 * @returns {boolean} Whether the item is equipped.
 */
function isEquipped(actor, item) {
   if (item.type === 'armor') {
      return actor.system.equipped.armor === item.id;
   }
   if (item.type === 'shield') {
      return actor.system.equipped.shield === item.id;
   }
   return item.system.equipped === true;
}

/**
 * Builds the shared trailing sub-buttons (send to chat / open sheet) for an item or effect.
 * @param {object} doc - The item or effect.
 * @param {object} options - The actionMenu options.
 * @param {boolean} [includeSendToChat] - Whether the send-to-chat button applies to this doc.
 * @returns {Array<object>} The trailing sub-buttons, respecting the per-type gates.
 */
function buildTrailingSubButtons(doc, options, includeSendToChat = true) {
   /** @type {Array<object>} The accumulated buttons. */
   const buttons = [];
   if (includeSendToChat && options.subButtons.sendToChat) {
      buttons.push({
         key: 'send-to-chat',
         labelKey: 'sendToChat',
         icon: SEND_TO_CHAT_ICON,
         action: () => doc.sendToChat(),
      });
   }
   if (options.subButtons.openSheet) {
      buttons.push({
         key: 'open-sheet',
         labelKey: 'openSheet',
         icon: SHEET_ICON,
         action: () => doc.sheet.render(true),
      });
   }
   return buttons;
}

/**
 * Builds one sub-button per embedded check on an item.
 * @param {object} actor - The owning actor.
 * @param {object} item - The item carrying the checks.
 * @param {object} options - The actionMenu options.
 * @returns {Array<object>} The check sub-buttons, or none when the type gate is off.
 */
function buildItemCheckSubButtons(actor, item, options) {
   if (!options.subButtons.checks) {
      return [];
   }
   return (item.system.check ?? []).map((check, checkIdx) => {
      return {
         key: `check-${checkIdx}`,
         label: check.label,
         icon: DICE_ICON,
         action: () => actor.system.requestItemCheck({ itemId: item.id, checkIdx }),
      };
   });
}

/**
 * Builds the equip/unequip toggle sub-button for an equippable item.
 * @param {object} actor - The owning actor.
 * @param {object} item - The equippable item.
 * @param {object} options - The actionMenu options.
 * @returns {Array<object>} The toggle button, or none when the type gate is off.
 */
function buildEquipSubButton(actor, item, options) {
   if (!options.subButtons.equipped) {
      return [];
   }
   return [{
      key: 'equipped',
      labelKey: isEquipped(actor, item) ? 'unEquip' : 'equip',
      icon: EQUIP_TOGGLE_ICON,
      action: () => actor.system.toggleEquipped(item.id),
   }];
}

/**
 * Builds the weapons category sub-options for the primary actor.
 * @param {object} primary - The primary actor.
 * @param {object} options - The actionMenu options.
 * @returns {Array<object>} The weapon sub-options.
 */
function buildWeapons(primary, options) {
   return primary.items
      .filter((item) => item.type === 'weapon')
      .filter((item) => {
         return !options.filters.weaponsWithActions
            || (item.system.attack?.length ?? 0) > 0
            || (item.system.check?.length ?? 0) > 0;
      })
      .map((item) => {
         /** @type {boolean} Whether the weapon is currently equipped. */
         const equipped = isEquipped(primary, item);

         /** @type {number} The weapon's attack count. */
         const attackCount = item.system.attack?.length ?? 0;

         /**
          * Performs the weapon main action: equipped attacks first, unequipped equips, equipped
          * without attacks rolls the first check, and a bare weapon opens its sheet.
          * @returns {void}
          */
         const mainAction = () => {
            if (equipped && attackCount > 0) {
               primary.system.requestAttackCheck({ itemId: item.id, attackIdx: 0 });
            }
            else if (!equipped) {
               primary.system.toggleEquipped(item.id);
            }
            else if ((item.system.check?.length ?? 0) > 0) {
               primary.system.requestItemCheck({ itemId: item.id, checkIdx: 0 });
            }
            else {
               item.sheet.render(true);
            }
         };

         /** @type {Array<object>} Attack sub-buttons, when the type gate is on. */
         const attackButtons = options.subButtons.attacks
            ? (item.system.attack ?? []).map((attack, attackIdx) => {
               return {
                  key: `attack-${attackIdx}`,
                  label: attack.label,
                  icon: attack.type === 'ranged' ? ACCURACY_ICON : MELEE_ICON,
                  action: () => primary.system.requestAttackCheck({ itemId: item.id, attackIdx }),
               };
            })
            : [];

         return {
            key: item.id,
            label: item.name,
            img: item.img,
            mainAction,
            subButtons: [
               ...attackButtons,
               ...buildItemCheckSubButtons(primary, item, options),
               ...buildEquipSubButton(primary, item, options),
               ...buildTrailingSubButtons(item, options),
            ],
         };
      });
}

/**
 * Builds the inventory category (non-weapon, non-spell, non-ability items) for the primary actor.
 * @param {object} primary - The primary actor.
 * @param {object} options - The actionMenu options.
 * @returns {Array<object>} The inventory sub-options.
 */
function buildInventory(primary, options) {
   return primary.items
      .filter((item) => !['weapon', 'spell', 'ability'].includes(item.type))
      .filter((item) => !options.filters.inventoryWithChecks || (item.system.check?.length ?? 0) > 0)
      .map((item) => {
         /** @type {boolean} Whether the item type participates in equipping. */
         const equippable = EQUIPPABLE_TYPES.includes(item.type);

         /**
          * Performs the inventory main action: unequipped equippables equip, items with checks
          * roll the first check, and anything else opens its sheet.
          * @returns {void}
          */
         const mainAction = () => {
            if (equippable && !isEquipped(primary, item)) {
               primary.system.toggleEquipped(item.id);
            }
            else if ((item.system.check?.length ?? 0) > 0) {
               primary.system.requestItemCheck({ itemId: item.id, checkIdx: 0 });
            }
            else {
               item.sheet.render(true);
            }
         };

         /** @type {Array<object>} Quantity steppers for commodities, when the type gate is on. */
         const quantityButtons = item.type === 'commodity' && options.subButtons.quantity
            ? [
               {
                  key: 'quantity-increase',
                  labelKey: 'increaseQuantity',
                  icon: INCREMENT_ICON,
                  action: () => item.update({ system: { quantity: Math.max(0, item.system.quantity + 1) } }),
               },
               {
                  key: 'quantity-decrease',
                  labelKey: 'decreaseQuantity',
                  icon: DECREMENT_ICON,
                  action: () => item.update({ system: { quantity: Math.max(0, item.system.quantity - 1) } }),
               },
            ]
            : [];

         return {
            key: item.id,
            label: item.name,
            img: item.img,
            mainAction,
            subButtons: [
               ...buildItemCheckSubButtons(primary, item, options),
               ...(equippable ? buildEquipSubButton(primary, item, options) : []),
               ...quantityButtons,
               ...buildTrailingSubButtons(item, options),
            ],
         };
      });
}

/**
 * Builds an item category whose main action rolls the first check (abilities) or the casting
 * check (spells), with checks + chat + sheet sub-buttons.
 * @param {object} primary - The primary actor.
 * @param {object} options - The actionMenu options.
 * @param {string} type - The item type ('ability' or 'spell').
 * @returns {Array<object>} The sub-options.
 */
function buildCheckItemCategory(primary, options, type) {
   return primary.items
      .filter((item) => item.type === type)
      .filter((item) => {
         return type !== 'ability'
            || !options.filters.abilitiesWithChecks
            || (item.system.check?.length ?? 0) > 0;
      })
      .map((item) => {
         /**
          * Performs the main action: spells roll the casting check; abilities roll their first
          * check or open the sheet when they have none.
          * @returns {void}
          */
         const mainAction = () => {
            if (type === 'spell') {
               primary.system.requestCastingCheck({ itemId: item.id });
            }
            else if ((item.system.check?.length ?? 0) > 0) {
               primary.system.requestItemCheck({ itemId: item.id, checkIdx: 0 });
            }
            else {
               item.sheet.render(true);
            }
         };

         return {
            key: item.id,
            label: item.name,
            img: item.img,
            mainAction,
            subButtons: [
               ...buildItemCheckSubButtons(primary, item, options),
               ...buildTrailingSubButtons(item, options),
            ],
         };
      });
}

/**
 * Builds the effects category from the primary actor's active effects.
 * @param {object} primary - The primary actor.
 * @param {object} options - The actionMenu options.
 * @returns {Array<object>} The effect sub-options.
 */
function buildEffects(primary, options) {
   return Array.from(primary.effects)
      .filter((effect) => !options.filters.effectsWithChecks || (effect.system?.check?.length ?? 0) > 0)
      .map((effect) => {
         /** @type {boolean} Whether this is a full effect (conditions carry no duration/chat card). */
         const isEffect = effect.type === 'effect';

         /** @type {number} The effect's embedded-check count. */
         const checkCount = effect.system?.check?.length ?? 0;

         /**
          * Performs the effect main action: roll the first embedded check, else open the sheet.
          * @returns {void}
          */
         const mainAction = () => {
            if (checkCount > 0) {
               primary.system.requestItemCheck({ itemRollData: effect.getRollData(), checkIdx: 0 });
            }
            else {
               effect.sheet.render(true);
            }
         };

         /** @type {Array<object>} Check sub-buttons rolled through the effect's roll data. */
         const checkButtons = options.subButtons.checks
            ? (effect.system?.check ?? []).map((check, checkIdx) => {
               return {
                  key: `check-${checkIdx}`,
                  label: check.label,
                  icon: DICE_ICON,
                  action: () => primary.system.requestItemCheck({
                     itemRollData: effect.getRollData(),
                     checkIdx,
                  }),
               };
            })
            : [];

         /** @type {Array<object>} Duration steppers for full effects, when the type gate is on. */
         const durationButtons = isEffect && options.subButtons.duration
            ? [
               {
                  key: 'duration-increase',
                  labelKey: 'increaseDuration',
                  icon: INCREMENT_ICON,
                  action: () => effect.update({
                     system: { duration: { remaining: Math.max(0, effect.system.duration.remaining + 1) } },
                  }),
               },
               {
                  key: 'duration-decrease',
                  labelKey: 'decreaseDuration',
                  icon: DECREMENT_ICON,
                  action: () => effect.update({
                     system: { duration: { remaining: Math.max(0, effect.system.duration.remaining - 1) } },
                  }),
               },
            ]
            : [];

         /** @type {Array<object>} The remove sub-button, when the type gate is on. */
         const removeButton = options.subButtons.remove
            ? [{
               key: 'remove',
               labelKey: 'deleteEffect',
               icon: DELETE_ICON,
               action: () => primary.system.requestEffectDeletion(effect.id),
            }]
            : [];

         return {
            key: effect.id,
            label: effect.name,
            img: effect.img,
            mainAction,
            subButtons: [
               ...checkButtons,
               ...durationButtons,
               ...removeButton,
               ...buildTrailingSubButtons(effect, options, isEffect),
            ],
         };
      });
}

/**
 * Builds the utility category for the resolved actors.
 * @param {Array<object>} actors - All resolved actors.
 * @returns {Array<object>} The utility sub-options.
 */
function buildUtility(actors) {
   /** @type {Array<object>} The accumulated sub-options. */
   const subOptions = [];

   if (actors.some((actor) => actor.type === 'player')) {
      subOptions.push({
         key: 'toggleInspiration',
         labelKey: 'toggleInspiration',
         mainAction: () => {
            for (const actor of actors.filter((entry) => entry.type === 'player')) {
               actor.system.toggleInspiration();
            }
         },
         subButtons: [],
      });
   }

   for (const key of ['shortRest', 'longRest', 'removeCombatEffects']) {
      subOptions.push({
         key,
         labelKey: key,
         mainAction: () => {
            for (const actor of actors) {
               actor.system[key]({});
            }
         },
         subButtons: [],
      });
   }

   // The four apply actions prompt for an amount; the menu component owns the dialog wiring.
   for (const key of ['applyDamage', 'applyHealing', 'applyRend', 'applyRepairs']) {
      subOptions.push({
         key,
         labelKey: key,
         amountPrompt: true,
         subButtons: [],
      });
   }

   return subOptions;
}

/**
 * Builds the action-menu model for the resolved actors.
 * @param {object} params - Build inputs.
 * @param {Array<object>} params.actors - All resolved actors (group actions iterate these).
 * @param {object | null} params.primary - The primary actor (single-character categories read it).
 * @param {object} params.options - The actionMenu options (categories/subButtons/filters/...).
 * @returns {Array<object>} The category model; empty and disabled categories are omitted.
 */
export default function buildActionMenuModel({ actors, primary, options }) {
   /** @type {boolean} Whether more than one character resolved (group mode). */
   const group = actors.length > 1;

   /** @type {Array<object>} The candidate categories, in display order. */
   const categories = [
      {
         key: 'skills',
         labelKey: 'skills',
         subOptions: HUD_SKILLS.map((skill) => {
            return {
               key: skill,
               labelKey: skill,
               mainAction: () => {
                  for (const actor of actors) {
                     actor.system.requestAttributeCheck({ attribute: 'default', skill });
                  }
               },
               subButtons: [],
            };
         }),
      },
      {
         key: 'resistances',
         labelKey: 'resistances',
         subOptions: HUD_RESISTANCES.map((resistance) => {
            return {
               key: resistance,
               labelKey: resistance,
               mainAction: () => {
                  for (const actor of actors) {
                     actor.system.requestResistanceCheck({ resistance });
                  }
               },
               subButtons: [],
            };
         }),
      },
      ...(group || !primary
         ? []
         : [
            { key: 'weapons', labelKey: 'weapons', subOptions: buildWeapons(primary, options) },
            { key: 'inventory', labelKey: 'inventory', subOptions: buildInventory(primary, options) },
            { key: 'abilities', labelKey: 'abilities', subOptions: buildCheckItemCategory(primary, options, 'ability') },
            { key: 'spells', labelKey: 'spells', subOptions: buildCheckItemCategory(primary, options, 'spell') },
            { key: 'effects', labelKey: 'effects', subOptions: buildEffects(primary, options) },
         ]),
      {
         key: 'utility',
         labelKey: 'utility',
         subOptions: buildUtility(actors),
      },
   ];

   return categories.filter((entry) => options.categories[entry.key] !== false && entry.subOptions.length > 0);
}
