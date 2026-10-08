import createFlatModifierElement from '~/document/types/item/rules-element/FlatModifier.js';
import createMulBaseElement from '~/document/types/item/rules-element/MulBase.js';
import createMulSumElement from '~/document/types/item/rules-element/MulSum.js';
import createSetSumElement from '~/document/types/item/rules-element/SetSum.js';
import createFastHealingElement from '~/document/types/item/rules-element/FastHealing.js';
import createPersistentDamageElement from '~/document/types/item/rules-element/PersistentDamage.js';
import createTurnMessageElement from '~/document/types/item/rules-element/TurnMessage.js';
import createRollMessageElement from '~/document/types/item/rules-element/RollMessage.js';
import createConditionalRatingModifierElement from '~/document/types/item/rules-element/ConditionalRatingModifier.js';
import createConditionalCheckModifierElement from '~/document/types/item/rules-element/ConditionalCheckModifier.js';

/**
 * The factory of every rules-element operation, keyed by operation, in editor display order. The single source of the
 * operations: RULES_ELEMENT_OPERATIONS is its key list and the operation select rebuilds a retyped element through it.
 * Each factory takes the element being replaced (its `uuid` is kept) and returns the operation's default element.
 * Implicit coupling: the item sheet's editor dispatch (ItemSheetRulesElementSettings) and the actor's bucket switch
 * (CharacterDataModel._applyRulesElements) must name every key; RulesElementOperationRegistry.test.js enforces both.
 * @type {Readonly<Record<string, (options?: object) => object>>}
 */
export const RULES_ELEMENT_FACTORIES = Object.freeze({
   flatModifier: createFlatModifierElement,
   mulBase: createMulBaseElement,
   mulSum: createMulSumElement,
   setSum: createSetSumElement,
   fastHealing: createFastHealingElement,
   persistentDamage: createPersistentDamageElement,
   turnMessage: createTurnMessageElement,
   rollMessage: createRollMessageElement,
   conditionalRatingModifier: createConditionalRatingModifierElement,
   conditionalCheckModifier: createConditionalCheckModifierElement,
});
