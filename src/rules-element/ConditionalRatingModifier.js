import { v4 as uuidv4 } from 'uuid';
import { sortObjectsIntoContainerByKey } from '~/helpers/Utility';
import { camelize } from '~/helpers/Utility';

export function getConditionalRatingModifierTemplate(uuid, type) {
   return {
      operation: 'conditionalRatingModifier',
      rating: 'accuracy',
      selector: 'customAttackTrait',
      key: '',
      value: 1,
      uuid: uuid ?? uuidv4(),
      type: type ?? 'effect'
   };
}

export function applyConditionalRatingModifierElements(elements) {
   if (elements.length > 0) {
      const conditionalRatingModifiers = {};
      // Sort elements by rating
      const ratings = sortObjectsIntoContainerByKey(elements, 'rating');

      // For each rating
      for (const [rating, ratingElements] of Object.entries(ratings)) {
         {
            // Initialize rating map
            conditionalRatingModifiers[rating] = {};
            const ratingMap = conditionalRatingModifiers[rating];

            // Sort elements by selector
            const selectors = sortObjectsIntoContainerByKey(ratingElements, 'selector');

            // For each selector
            for (const [selector, selectorElements] of Object.entries(selectors)) {

               // Hand special case for multi attack
               if (selector === 'multiAttack') {
                  ratingMap.multiAttack = 0;
                  for (const element of selectorElements) {
                     ratingMap.multiAttack += element.value;
                  }
               }

               else {
                  // Initialize rating map
                  ratingMap[selector] = {};
                  const selectorMap = ratingMap[selector];

                  // Cache whether to camelize keys
                  let camelizeKeys = false;
                  switch (selector) {
                     case 'customAttackTrait':
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
         }
      }

      if (conditionalRatingModifiers.defense) {
         applyDefenseRatingModifier(this, conditionalRatingModifiers.defense);
      }

      this.conditionalRatingModifier = conditionalRatingModifiers;
      return;
   }

   this.conditionalRatingModifier = false;
   return;
}

function getRatingMods(conditionalRatingModifiers, selector, key) {
   const selectorMods = conditionalRatingModifiers[selector];
   if (selectorMods) {
      const keyMod = selectorMods[key];
      if (keyMod) {
         return keyMod;
      }
   }

   return 0;
}

function getRatingModsForReducedKeys(conditionalDiceModifiers, selector, keys, reduceFunction) {
   let retVal = [];
   const selectorMods = conditionalDiceModifiers[selector];
   if (selectorMods) {
      keys.forEach((key) => {
         const keyMod = selectorMods[reduceFunction(key)];
         if (keyMod) {
            retVal.push(keyMod);
         }
      });
   }

   return retVal;
}

function applyDefenseRatingModifier(character, conditionalDefenseModifiers) {
   // Apply armor bonuses
   const armor = character.getArmor();
   if (armor) {

      // Armor traits
      const armorTraits = armor.system.trait;
      if (armorTraits.length > 0) {
         const armorTraitMods = getRatingModsForReducedKeys(conditionalDefenseModifiers, 'armorTrait', armorTraits, (trait) => trait.name);
         if (armorTraitMods.length > 0) {
            for (const armorTraitMod of armorTraitMods) {
               for (const [type, value] of Object.entries(armorTraitMod)) {
                  character.parent.system.rating.defense.mod[type] += value;
               }
            }
         }
      }

      // Custom armor traits
      const customArmorTraits = armor.system.customTrait;
      if (customArmorTraits.length > 0) {
         const customArmorTraitMods = getRatingModsForReducedKeys(conditionalDefenseModifiers, 'customArmorTrait', customArmorTraits, (trait) => camelize(trait.name));
         if (customArmorTraitMods.length > 0) {
            for (const customArmorTraitMod of customArmorTraitMods) {
               for (const [type, value] of Object.entries(customArmorTraitMod)) {
                  character.parent.system.rating.defense.mod[type] += value;
               }
            }
         }
      }
   }
}