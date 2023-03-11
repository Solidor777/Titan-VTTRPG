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

   // If conditional dice modifiers exist
   const conditionalDiceModifiers = this.conditionalDiceModifier?.attack;
   if (conditionalDiceModifiers) {

      // Get mods for the attack type
      retVal += getDiceMods(conditionalDiceModifiers, 'attackType', attack.type);

      // Get mods for the attack traits
      retVal += getDiceModsForReducedKeys(conditionalDiceModifiers, 'attackTrait', attack.trait, (trait) => trait.name);

      // Get mods for custom traits
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
      retVal += getDiceModsForReducedKeys(conditionalDiceModifiers, 'customTrait', customTraits, (trait) => (trait));

      // Get multi attack mods
      if (multiAttack && conditionalDiceModifiers.multiAttack) {
         retVal += conditionalDiceModifiers.multiAttack;
      }
   }

   return retVal;
}

export function getCastingCheckDiceMod(item) {
   // Normal mod is 0. Contaminated mod is -1.
   let retVal = this.parent.system.condition.contaminated ? -1 : 0;

   // If conditional dice modifiers exist
   const conditionalDiceModifiers = this.conditionalDiceModifier?.casting;
   if (conditionalDiceModifiers) {

      // Get mods for the spell tradition
      retVal += getDiceMods(conditionalDiceModifiers, 'spellTradition', camelize(item.system.tradition));

      // Get mods for custom traits
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
      retVal += getDiceModsForReducedKeys(conditionalDiceModifiers, 'customTrait', customTraits, (trait) => (trait));
   }

   return retVal;
}

export function getItemCheckDiceMod(item) {
   // Normal mod is 0. Contaminated mod is -1.
   let retVal = this.parent.system.condition.contaminated ? -1 : 0;

   // If conditional dice modifiers exist
   const conditionalDiceModifiers = this.conditionalDiceModifier?.item;
   if (conditionalDiceModifiers) {

      // Get mods for custom traits
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
      retVal += getDiceModsForReducedKeys(conditionalDiceModifiers, 'customTrait', customTraits, (trait) => (trait));
   }

   return retVal;
}