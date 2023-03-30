import { v4 as uuidv4 } from 'uuid';
import { sortObjectsIntoContainerByKey } from '~/helpers/Utility';
import { camelize } from '~/helpers/Utility';

export function getConditionalCheckModifierTemplate(uuid, type) {
   return {
      operation: 'conditionalCheckModifier',
      modifierType: 'damage',
      checkType: 'any',
      selector: 'any',
      key: '',
      value: 1,
      uuid: uuid ?? uuidv4(),
      type: type ?? ''
   };
}

export function applyConditionalCheckModifierElements(elements) {
   if (elements.length > 0) {
      const conditionalCheckModifiers = {};

      // Sort elements by modifier type
      const modifierTypes = sortObjectsIntoContainerByKey(elements, 'modifierType');

      // For each modifier type
      for (const [modifierType, modifierTypeElements] of Object.entries(modifierTypes)) {
         const modifierTypeMap = {};
         conditionalCheckModifiers[modifierType] = modifierTypeMap;

         // Sort elements by check type
         const checkTypes = sortObjectsIntoContainerByKey(modifierTypeElements, 'checkType');

         // For each check type
         for (const [checkType, checkTypeElements] of Object.entries(checkTypes)) {
            const checkTypeMap = {};
            modifierTypeMap[checkType] = checkTypeMap;

            // Sort elements by selector
            const selectors = sortObjectsIntoContainerByKey(checkTypeElements, 'selector');

            // For each selector
            for (const [selector, selectorElements] of Object.entries(selectors)) {
               switch (selector) {
                  // Special case handling for any and multi-attack
                  case 'any':
                  case 'multiAttack': {
                     checkTypeMap[selector] = 0;
                     for (const element of selectorElements) {
                        checkTypeMap[selector] += element.value;
                     }
                     break;
                  }

                  // Normal flow
                  default: {
                     checkTypeMap[selector] = {};
                     const selectorMap = checkTypeMap[selector];
                     let camelizeKeys = false;
                     switch (selector) {
                        case 'customTrait':
                        case 'spellTradition': {
                           camelizeKeys = true;
                        }
                     }

                     // Sort elements by key
                     const keys = sortObjectsIntoContainerByKey(selectorElements, 'key');

                     // For each key
                     for (const [key, keyElements] of Object.entries(keys)) {
                        const formattedKey = camelizeKeys ? camelize(key) : key;

                        // Initialize key value
                        selectorMap[formattedKey] = 0; {

                           // For each element
                           for (const element of keyElements) {

                              // Add to the key value
                              selectorMap[formattedKey] += element.value;
                           }
                        }
                     }

                     break;
                  }
               }
            }
         }
      }

      this.conditionalCheckModifier = conditionalCheckModifiers;
      return;
   }

   this.conditionalCheckModifier = false;
   return;
}

function getCheckMods(conditionalCheckModifiers, selector, key) {
   const selectorMods = conditionalCheckModifiers[selector];
   if (selectorMods) {
      const keyMod = selectorMods[key];
      if (keyMod) {
         return keyMod;
      }
   }

   return 0;
}

function getCheckModsForReducedKeys(conditionalCheckModifiers, selector, keys, reduceFunction) {
   let retVal = 0;
   const selectorMods = conditionalCheckModifiers[selector];
   if (selectorMods) {
      keys.forEach((key) => {
         const keyMod = selectorMods[reduceFunction(key)];
         if (keyMod) {
            retVal += keyMod;
         }
      });
   }

   return retVal;
}

export function getAttackCheckMod(modifierType, item, attack, multiAttack) {
   // Contaminated creatures have -1 to all dice rolls
   let retVal = 0;

   // Check for conditional modifiers
   if (this.conditionalCheckModifier && this.conditionalCheckModifier[modifierType] && this.conditionalCheckModifier[modifierType]) {
      const checkMods = this.conditionalCheckModifier[modifierType];

      // Any check mods
      const anyCheckMods = checkMods.any;
      if (anyCheckMods) {

         // Attribute
         retVal += getCheckMods(anyCheckMods, 'attribute', attack.attribute);

         // Custom Traits
         const customTraits = [];

         // Ensure attack traits are unique
         for (const trait of (attack.customTrait)) {
            const formattedName = camelize(trait.name);
            if (!customTraits.find((match) => {
               return camelize(match.name) === formattedName;
            })) {
               customTraits.push(formattedName);
            }
         }

         // Ensure item traits are unique
         for (const trait of item.system.customTrait) {
            const formattedName = camelize(trait.name);
            if (!customTraits.find((match) => {
               return camelize(match) === formattedName;
            })) {
               customTraits.push(formattedName);
            }
         }
         retVal += getCheckModsForReducedKeys(anyCheckMods, 'customTrait', customTraits, (trait) => (trait));

         // Get any mods
         if (anyCheckMods.any) {
            retVal += anyCheckMods.any;
         }
      }

      // Attack check mods
      const attackCheckMods = checkMods.attack;
      if (attackCheckMods) {
         // Attribute
         retVal += getCheckMods(attackCheckMods, 'attribute', attack.attribute);

         // Skill
         retVal += getCheckMods(attackCheckMods, 'skill', attack.skill);

         // Attack Type
         retVal += getCheckMods(attackCheckMods, 'attackType', attack.type);

         // Attack Traits
         retVal += getCheckModsForReducedKeys(attackCheckMods, 'attackTrait', attack.trait, (trait) => trait.name);

         // Custom Traits
         const customTraits = [];

         // Ensure attack traits are unique
         for (const trait of (attack.customTrait)) {
            const formattedName = camelize(trait.name);
            if (!customTraits.find((match) => {
               return camelize(match.name) === formattedName;
            })) {
               customTraits.push(formattedName);
            }
         }

         // Ensure item traits are unique
         for (const trait of item.system.customTrait) {
            const formattedName = camelize(trait.name);
            if (!customTraits.find((match) => {
               return camelize(match) === formattedName;
            })) {
               customTraits.push(formattedName);
            }
         }
         retVal += getCheckModsForReducedKeys(attackCheckMods, 'customTrait', customTraits, (trait) => (trait));

         // Get multi attack mods
         if (multiAttack && attackCheckMods.multiAttack) {
            retVal += attackCheckMods.multiAttack;
         }

         // Get any mods
         if (attackCheckMods.any) {
            retVal += attackCheckMods.any;
         }
      }
   }

   return retVal;
}

export function getCastingCheckMod(modifierType, item) {
   // Contaminated creatures have -1 to all dice rolls
   let retVal = 0;

   // Check for conditional modifiers
   if (this.conditionalCheckModifier && this.conditionalCheckModifier[modifierType] && this.conditionalCheckModifier[modifierType]) {
      const checkMods = this.conditionalCheckModifier[modifierType];

      // Any check mods
      const anyCheckMods = checkMods.any;
      if (anyCheckMods) {

         // Attribute
         retVal += getCheckMods(anyCheckMods, 'attribute', item.system.castingCheck.attribute);

         // Custom traits
         const customTraits = [];

         // Ensure item traits are unique
         for (const trait of item.system.customTrait) {
            const formattedName = camelize(trait.name);
            if (!customTraits.find((match) => {
               return camelize(match.name) === formattedName;
            })) {
               customTraits.push(formattedName);
            }
         }

         retVal += getCheckModsForReducedKeys(anyCheckMods, 'customTrait', customTraits, (trait) => (trait));

         // Get any mods
         if (anyCheckMods.any) {
            retVal += anyCheckMods.any;
         }
      }

      // Casting check mods
      const castingCheckMods = checkMods.casting;
      if (castingCheckMods) {

         // Attribute
         retVal += getCheckMods(castingCheckMods, 'attribute', item.system.castingCheck.attribute);

         // Skill
         retVal += getCheckMods(castingCheckMods, 'skill', item.system.castingCheck.skill);

         // Spell tradition
         retVal += getCheckMods(castingCheckMods, 'spellTradition', camelize(item.system.tradition));

         // Custom traits
         const customTraits = [];

         // Ensure item traits are unique
         for (const trait of item.system.customTrait) {
            const formattedName = camelize(trait.name);
            if (!customTraits.find((match) => {
               return camelize(match.name) === formattedName;
            })) {
               customTraits.push(formattedName);
            }
         }

         retVal += getCheckModsForReducedKeys(castingCheckMods, 'customTrait', customTraits, (trait) => (trait));

         // Get any mods
         if (castingCheckMods.any) {
            retVal += castingCheckMods.any;
         }
      }
   }

   return retVal;
}

export function getItemCheckMod(modifierType, item, check) {
   // Contaminated creatures have -1 to all dice rolls
   let retVal = 0;

   // Check for conditional modifiers
   if (this.conditionalCheckModifier && this.conditionalCheckModifier[modifierType] && this.conditionalCheckModifier[modifierType]) {
      const checkMods = this.conditionalCheckModifier[modifierType];

      // Any check mods
      const anyCheckMods = checkMods.any;
      if (anyCheckMods) {

         // Attribute
         retVal += getCheckMods(anyCheckMods, 'attribute', check.attribute);

         // Custom traits
         const customTraits = [];

         // Ensure item traits are unique
         for (const trait of item.system.customTrait) {
            const formattedName = camelize(trait.name);
            if (!customTraits.find((match) => {
               return camelize(match.name) === formattedName;
            })) {
               customTraits.push(formattedName);
            }
         }

         retVal += getCheckModsForReducedKeys(anyCheckMods, 'customTrait', customTraits, (trait) => (trait));

         // Get any mods
         if (anyCheckMods.any) {
            retVal += anyCheckMods.any;
         }
      }

      // Item check mods
      const itemCheckMods = checkMods.item;
      if (itemCheckMods) {

         // Attribute
         retVal += getCheckMods(itemCheckMods, 'attribute', check.attribute);

         // Skill
         retVal += getCheckMods(itemCheckMods, 'skill', check.skill);

         // Custom traits
         const customTraits = [];

         // Ensure item traits are unique
         for (const trait of item.system.customTrait) {
            const formattedName = camelize(trait.name);
            if (!customTraits.find((match) => {
               return camelize(match.name) === formattedName;
            })) {
               customTraits.push(formattedName);
            }
         }

         retVal += getCheckModsForReducedKeys(itemCheckMods, 'customTrait', customTraits, (trait) => (trait));

         // Get any mods
         if (itemCheckMods.any) {
            retVal += itemCheckMods.any;
         }
      }
   }

   return retVal;
}

export function getAttributeCheckMod(modifierType, attribute, skill) {
   // Contaminated creatures have -1 to all dice rolls
   let retVal = 0;

   // Check for conditional modifiers
   if (this.conditionalCheckModifier && this.conditionalCheckModifier[modifierType] && this.conditionalCheckModifier[modifierType]) {
      const checkMods = this.conditionalCheckModifier[modifierType];

      // Any check mods
      const anyCheckMods = checkMods.any;
      if (anyCheckMods) {

         // Attribute
         retVal += getCheckMods(anyCheckMods, 'attribute', attribute);
         retVal += getCheckMods(anyCheckMods, 'skill', skill);

         // Get any mods
         if (anyCheckMods.any) {
            retVal += anyCheckMods.any;
         }
      }
   }

   return retVal;
}