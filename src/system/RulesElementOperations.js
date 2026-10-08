import { RULES_ELEMENT_FACTORIES } from '~/document/types/item/rules-element/RulesElementFactories.js';

/**
 * Every system Rules Element operation, in editor display order: the keys of RULES_ELEMENT_FACTORIES.
 * @type {readonly string[]}
 */
export const RULES_ELEMENT_OPERATIONS = Object.freeze(Object.keys(RULES_ELEMENT_FACTORIES));
