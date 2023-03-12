import { v4 as uuidv4 } from 'uuid';
import { sortObjectsIntoContainerByKey } from '~/helpers/Utility';
import { camelize } from '~/helpers/Utility';

export function getConditionalDamageModifierTemplate(uuid, type) {
   return {
      operation: 'conditionalDamageModifier',
      checkType: 'attack',
      selector: 'attackTrait',
      key: 'blast',
      value: 1,
      uuid: uuid ?? uuidv4(),
      type: type ?? ''
   };
}

export function applyConditionalDamageModifierElements(elements) {
   if (elements.length > 0) {
      const conditionalDamageModifiers = {};
      // Sort elects by check type
      const checkTypes = sortObjectsIntoContainerByKey(elements, 'checkType');

      // For each check type
      for (const [checkType, checkTypeElements] of Object.entries(checkTypes)) {
         conditionalDamageModifiers[checkType] = {};
         const checkTypeMap = conditionalDamageModifiers[checkType];

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

      this.conditionalDamageModifier = conditionalDamageModifiers;
      return;
   }

   this.conditionalDamageModifier = false;
   return;
}

function getDamageMods(conditionalDamageModifiers, selector, key) {
   const selectorMods = conditionalDamageModifiers[selector];
   if (selectorMods) {
      const keyMod = selectorMods[key];
      if (keyMod) {
         return keyMod;
      }
   }

   return 0;
}

function getDamageModsForReducedKeys(conditionalDamageModifiers, selector, keys, reduceFunction) {
   let retVal = 0;
   const selectorMods = conditionalDamageModifiers[selector];
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

export function getAttackCheckDamageMod(item, attack, multiAttack) {
   // Normal mod is 0. Contaminated mod is -1.
   let retVal = this.parent.system.condition.contaminated ? -1 : 0;

   // If conditional damage modifiers exist
   const conditionalDamageModifiers = this.conditionalDamageModifier?.attack;
   if (conditionalDamageModifiers) {

      // Get mods for the attack type
      retVal += getDamageMods(conditionalDamageModifiers, 'attackType', attack.type);

      // Get mods for the attack traits
      retVal += getDamageModsForReducedKeys(conditionalDamageModifiers, 'attackTrait', attack.trait, (trait) => trait.name);

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
      retVal += getDamageModsForReducedKeys(conditionalDamageModifiers, 'customTrait', customTraits, (trait) => (trait));

      // Get multi attack mods
      if (multiAttack && conditionalDamageModifiers.multiAttack) {
         retVal += conditionalDamageModifiers.multiAttack;
      }
   }

   return retVal;
}

export function getCastingCheckDamageMod(item) {
   // Normal mod is 0. Contaminated mod is -1.
   let retVal = this.parent.system.condition.contaminated ? -1 : 0;

   // If conditional damage modifiers exist
   const conditionalDamageModifiers = this.conditionalDamageModifier?.casting;
   if (conditionalDamageModifiers) {

      // Get mods for the spell tradition
      retVal += getDamageMods(conditionalDamageModifiers, 'spellTradition', camelize(item.system.tradition));

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
      retVal += getDamageModsForReducedKeys(conditionalDamageModifiers, 'customTrait', customTraits, (trait) => (trait));
   }

   return retVal;
}

export function getItemCheckDamageMod(item) {
   // Normal mod is 0. Contaminated mod is -1.
   let retVal = this.parent.system.condition.contaminated ? -1 : 0;

   // If conditional damage modifiers exist
   const conditionalDamageModifiers = this.conditionalDamageModifier?.item;
   if (conditionalDamageModifiers) {

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
      retVal += getDamageModsForReducedKeys(conditionalDamageModifiers, 'customTrait', customTraits, (trait) => (trait));
   }

   return retVal;
}