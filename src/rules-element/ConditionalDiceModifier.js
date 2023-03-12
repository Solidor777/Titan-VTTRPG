import { v4 as uuidv4 } from 'uuid';
import { sortObjectsIntoContainerByKey } from '~/helpers/Utility';
import { camelize } from '~/helpers/Utility';

export function getConditionalDiceModifierTemplate(uuid, type) {
   return {
      operation: 'conditionalDiceModifier',
      checkType: 'attack',
      selector: 'attackTrait',
      key: 'blast',
      value: 1,
      uuid: uuid ?? uuidv4(),
      type: type ?? ''
   };
}

export function applyConditionalDiceModifierElements(elements) {
   if (elements.length > 0) {
      const conditionalDiceModifiers = {};
      // Sort elects by check type
      const checkTypes = sortObjectsIntoContainerByKey(elements, 'checkType');

      // For each check type
      for (const [checkType, checkTypeElements] of Object.entries(checkTypes)) {
         conditionalDiceModifiers[checkType] = {};
         const checkTypeMap = conditionalDiceModifiers[checkType];

         // Sort elements by selector
         const selectors = sortObjectsIntoContainerByKey(checkTypeElements, 'selector');

         // For each selector
         for (const [selector, selectorElements] of Object.entries(selectors)) {

            // Hand special case for multi attack
            if (selector === 'multiAttack') {
               checkTypeMap.multiAttack = 0;
               for (const element of selectorElements) {
                  checkTypeMap.multiAttack += element.value;
               }
            }

            // Normal flow
            else {
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
            }
         }
      }

      this.conditionalDiceModifier = conditionalDiceModifiers;
      return;
   }

   this.conditionalDiceModifier = false;
   return;
}

function getDiceMods(conditionalDiceModifiers, selector, key) {
   const selectorMods = conditionalDiceModifiers[selector];
   if (selectorMods) {
      const keyMod = selectorMods[key];
      if (keyMod) {
         return keyMod;
      }
   }

   return 0;
}

function getDiceModsForReducedKeys(conditionalDiceModifiers, selector, keys, reduceFunction) {
   let retVal = 0;
   const selectorMods = conditionalDiceModifiers[selector];
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

export function getAttackCheckDiceMod(item, attack, multiAttack) {
   // Normal mod is 0. Contaminated mod is -1.
   let retVal = this.parent.system.condition.contaminated ? -1 : 0;

   const diceMods = this.conditionalDiceModifier;
   if (diceMods) {
      // Any check dice mods
      const anyCheckDiceMods = diceMods.any;
      if (anyCheckDiceMods) {

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
         retVal += getDiceModsForReducedKeys(anyCheckDiceMods, 'customTrait', customTraits, (trait) => (trait));
      }

      // Attack check dice mods
      const attackCheckDiceMods = diceMods.attack;
      if (attackCheckDiceMods) {
         // Attribute
         retVal += getDiceMods(attackCheckDiceMods, 'attribute', attack.attribute);

         // Skill
         retVal += getDiceMods(attackCheckDiceMods, 'skill', attack.skill);

         // Attack Type
         retVal += getDiceMods(attackCheckDiceMods, 'attackType', attack.type);

         // Attack Traits
         retVal += getDiceModsForReducedKeys(attackCheckDiceMods, 'attackTrait', attack.trait, (trait) => trait.name);

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
         retVal += getDiceModsForReducedKeys(attackCheckDiceMods, 'customTrait', customTraits, (trait) => (trait));

         // Get multi attack mods
         if (multiAttack && attackCheckDiceMods.multiAttack) {
            retVal += attackCheckDiceMods.multiAttack;
         }
      }
   }

   return retVal;
}

export function getCastingCheckDiceMod(item) {
   // Normal mod is 0. Contaminated mod is -1.
   let retVal = this.parent.system.condition.contaminated ? -1 : 0;

   // If conditional dice modifiers exist
   const diceMods = this.conditionalDiceModifier;
   if (diceMods) {

      // Any check dice mods
      const anyCheckDiceMods = diceMods.any;
      if (anyCheckDiceMods) {

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

         retVal += getDiceModsForReducedKeys(anyCheckDiceMods, 'customTrait', customTraits, (trait) => (trait));
      }

      // Casting check dice mods
      const castingCheckDiceMods = diceMods.casting;
      if (castingCheckDiceMods) {

         // Attribute
         retVal += getDiceMods(castingCheckDiceMods, 'attribute', item.system.castingCheck.attribute);

         // Skill
         retVal += getDiceMods(castingCheckDiceMods, 'skill', item.system.castingCheck.skill);

         // Spell tradition
         retVal += getDiceMods(castingCheckDiceMods, 'spellTradition', camelize(item.system.tradition));

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

         retVal += getDiceModsForReducedKeys(castingCheckDiceMods, 'customTrait', customTraits, (trait) => (trait));
      }
   }

   return retVal;
}

export function getItemCheckDiceMod(item, check) {
   // Normal mod is 0. Contaminated mod is -1.
   let retVal = this.parent.system.condition.contaminated ? -1 : 0;
   const diceMods = this.conditionalDiceModifier;
   if (diceMods) {

      // Any check dice mods
      const anyCheckDiceMods = diceMods.any;
      if (anyCheckDiceMods) {

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

         retVal += getDiceModsForReducedKeys(anyCheckDiceMods, 'customTrait', customTraits, (trait) => (trait));
      }

      // Item check dice mods
      const itemCheckDiceMods = diceMods.item;
      if (itemCheckDiceMods) {

         // Attribute
         retVal += getDiceMods(itemCheckDiceMods, 'attribute', check.attribute);

         // Skill
         retVal += getDiceMods(itemCheckDiceMods, 'skill', check.skill);

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
         retVal += getDiceModsForReducedKeys(itemCheckDiceMods, 'customTrait', customTraits, (trait) => (trait));
      }
   }

   return retVal;
}