import { v4 as uuidv4 } from 'uuid';
import { sortObjectsIntoContainerByKey } from '~/helpers/Utility';
import { camelize } from '~/helpers/Utility';

export function getConditionalDamageModifierTemplate(uuid, type) {
   return {
      operation: 'conditionalDamageModifier',
      selector: 'customTrait',
      key: '',
      value: 1,
      uuid: uuid ?? uuidv4(),
      type: type ?? 'effect'
   };
}

export function applyConditionalDamageModifierElements(elements) {
   if (elements.length > 0) {
      const conditionalDamageModifiers = {};

      // Sort elements by selector
      const selectors = sortObjectsIntoContainerByKey(damageElements, 'selector');

      // For each selector
      for (const [selector, selectorElements] of Object.entries(selectors)) {

         // Hand special case for multi attack
         if (selector === 'multiAttack') {
            damageMap.multiAttack = {};

            // Sort elements by type
            const types = sortObjectsIntoContainerByKey(selectorElements, 'type');
            for (const [type, typeElements] of Object.entries(types)) {
               damageMap.multiAttack[type] = 0;
               for (const element of typeElements) {
                  damageMap.multiAttack[type] += element.value;
               }
            }
         }

         else {
            // Initialize damage map
            damageMap[selector] = {};
            const selectorMap = damageMap[selector];

            // Cache whether to camelize keys
            let camelizeKeys = false;
            switch (selector) {
               case 'customTrait':
               case 'customArmorTrait':
               case 'customShieldTrait': {
                  camelizeKeys = true;
               }
            }

            // Sort elements by key
            const keys = sortObjectsIntoContainerByKey(selectorElements, 'key');

            // For each key
            for (const [key, keyElements] of Object.entries(keys)) {
               const formattedKey = camelizeKeys ? camelize(key) : key;

               // Initialize key value
               selectorMap[formattedKey] = {}; {
                  const keyMap = selectorMap[formattedKey];

                  // Sort elements by type
                  const types = sortObjectsIntoContainerByKey(keyElements, 'type');

                  // For each type
                  for (const [type, typeElements] of Object.entries(types)) {
                     keyMap[type] = 0;

                     // For each element
                     for (const element of typeElements) {

                        // Add to the key value
                        keyMap[type] += element.value;
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

   return false;
}

function getDamageModsForReducedKeys(conditionalDiceModifiers, selector, keys, reduceFunction) {
   const retVal = {};
   const selectorMods = conditionalDiceModifiers[selector];
   if (selectorMods) {
      keys.forEach((key) => {
         const keyMod = selectorMods[reduceFunction(key)];
         if (keyMod) {
            for (const [type, value] of Object.entries(keyMod)) {
               retVal[type] = retVal[type] ?? 0;
               retVal[type] += value;
            }
         }
      });
   }

   return Object.keys(retVal).length > 0 ? retVal : false;
}

export function getAttackDamageModifier(attack, multiAttack) {
   let retVal = 0;
   const conditionalDamageModifiers = this.conditionalDamageModifier;
   if (conditionalDamageModifiers) {
      // Attack traits
      if (attack.trait.length > 0) {
         const attackTraitMods = getDamageModsForReducedKeys(conditionalDamageModifiers, 'attackTrait', attack.trait, (trait) => trait.name);
         if (attackTraitMods) {
            for (const value of Object.values(attackTraitMods)) {
               retVal += value;
            }
         }
      }

      // Custom attack traits
      if (attack.trait.length > 0) {
         const attackTraitMods = getDamageModsForReducedKeys(conditionalDamageModifiers, 'customTrait', attack.trait, (trait) => trait.name);
         if (attackTraitMods) {
            for (const value of Object.values(attackTraitMods)) {
               retVal += value;
            }
         }
      }

      // Attack type
      const attackTypeMods = getDamageMods(conditionalDamageModifiers, 'attackType', attack.type);
      if (attackTypeMods) {
         for (const value of Object.values(attackTypeMods)) {
            retVal += value;
         }
      }

      // Multi-attack
      if (multiAttack && conditionalDamageModifiers.multiAttack) {
         for (const value of Object.values(conditionalDamageModifiers.multiAttack)) {
            retVal += value;
         }
      }
   }
   return retVal;
}

export function getSpellDamageModifier() {
   let retVal = 0;
   const conditionalDamageModifiers = this.conditionalDamageModifier;

   return retVal;
}