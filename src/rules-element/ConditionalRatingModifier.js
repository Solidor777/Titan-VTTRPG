import { v4 as uuidv4 } from 'uuid';
import { sortObjectsIntoContainerByKey } from '~/helpers/Utility';
import { camelize } from '~/helpers/Utility';

export function getConditionalRatingModifierTemplate(uuid, type) {
   return {
      operation: 'conditionalRatingModifier',
      rating: 'accuracy',
      selector: 'attackTrait',
      key: 'blast',
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
                  ratingMap.multiAttack = {};

                  // Sort elements by type
                  const types = sortObjectsIntoContainerByKey(selectorElements, 'type');
                  for (const [type, typeElements] of Object.entries(types)) {
                     ratingMap.multiAttack[type] = 0;
                     for (const element of typeElements) {
                        ratingMap.multiAttack[type] += element.value;
                     }
                  }
               }

               else {
                  // Initialize rating map
                  ratingMap[selector] = {};
                  const selectorMap = ratingMap[selector];

                  // Cache whether to camelize keys
                  let camelizeKeys = false;
                  switch (selector) {
                     case 'customWeaponTrait':
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
   // Get mods for a particular rating
   const selectorMods = conditionalRatingModifiers[selector];
   if (selectorMods) {
      const keyMod = selectorMods[key];
      if (keyMod) {
         return keyMod;
      }
   }

   return false;
}

function getRatingModsForReducedKeys(conditionalDiceModifiers, selector, keys, reduceFunction) {
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

function applyDefenseRatingModifier(character, conditionalDefenseModifiers) {
   // Apply armor bonuses
   const armor = character.getArmor();
   if (armor) {

      // Armor traits
      const armorTraits = armor.system.trait;
      if (armorTraits.length > 0) {
         const armorTraitMods = getRatingModsForReducedKeys(conditionalDefenseModifiers, 'armorTrait', armorTraits, (trait) => trait.name);
         if (armorTraitMods) {
            for (const [type, value] of Object.entries(armorTraitMods)) {
               character.parent.system.rating.defense.mod[type] += value;
            }
         }
      }

      // Custom Armor traits
      const customArmorTraits = [];

      // Ensure traits are unique
      armor.system.customTrait.forEach((trait) => {
         const formattedName = camelize(trait.name);
         if (customArmorTraits.indexOf(formattedName) < 0) {
            customArmorTraits.push(formattedName);
         }
      });

      // Get mods
      if (customArmorTraits.length > 0) {
         const customArmorTraitMods = getRatingModsForReducedKeys(conditionalDefenseModifiers, 'customArmorTrait', customArmorTraits, (trait) => (trait));
         if (customArmorTraitMods) {
            for (const [type, value] of Object.entries(customArmorTraitMods)) {
               character.parent.system.rating.defense.mod[type] += value;
            }
         }
      }
   }

   // Apply shield bonuses
   const shield = character.getShield();
   if (shield) {

      // Shield traits
      const shieldTraits = shield.system.trait;
      if (shieldTraits.length > 0) {
         const shieldTraitMods = getRatingModsForReducedKeys(conditionalDefenseModifiers, 'shieldTrait', shieldTraits, (trait) => trait.name);
         if (shieldTraitMods) {
            for (const [type, value] of Object.entries(shieldTraitMods)) {
               character.parent.system.rating.defense.mod[type] += value;
            }
         }
      }

      // Custom Shield traits
      const customShieldTraits = [];

      // Ensure custom traits are unique
      shield.system.customTrait.forEach((trait) => {
         const formattedName = camelize(trait.name);
         if (customShieldTraits.indexOf(formattedName) < 0) {
            customShieldTraits.push(formattedName);
         }
      });

      // Get mods
      if (customShieldTraits.length > 0) {
         const customShieldTraitMods = getRatingModsForReducedKeys(conditionalDefenseModifiers, 'customShieldTrait', customShieldTraits, (trait) => (trait));
         if (customShieldTraitMods) {
            for (const [type, value] of Object.entries(customShieldTraitMods)) {
               character.parent.system.rating.defense.mod[type] += value;
            }
         }
      }
   }
}

export function getAttackRatingModifier(rating, weapon, attack, multiAttack) {
   let retVal = 0;
   const conditionalRatingModifiers = this.conditionalRatingModifier[rating];
   if (conditionalRatingModifiers) {
      // Attack traits
      const attackTraits = attack.trait;
      if (attackTraits.length > 0) {
         const attackTraitMods = getRatingModsForReducedKeys(conditionalRatingModifiers, 'attackTrait', attackTraits, (trait) => trait.name);
         if (attackTraitMods) {
            for (const value of Object.values(attackTraitMods)) {
               retVal += value;
            }
         }
      }

      // Custom traits
      const customTraits = [];

      // Ensure attack traits are unique
      attack.customTrait.forEach((trait) => {
         const formattedName = camelize(trait.name);
         if (customTraits.indexOf(formattedName) < 0) {
            customTraits.push(formattedName);
         }
      });

      // Ensure weapon traits are unique
      weapon.system.customTrait.forEach((trait) => {
         const formattedName = camelize(trait.name);
         if (customTraits.indexOf(formattedName) < 0) {
            customTraits.push(formattedName);
         }
      });

      // Get mods
      if (customTraits.length > 0) {
         const attackTraitMods = getRatingModsForReducedKeys(conditionalRatingModifiers, 'customWeaponTrait', customTraits, (trait) => (trait));
         if (attackTraitMods) {
            for (const value of Object.values(attackTraitMods)) {
               retVal += value;
            }
         }
      }

      // Attack type
      const attackTypeMods = getRatingMods(conditionalRatingModifiers, 'attackType', attack.type);
      if (attackTypeMods) {
         for (const value of Object.values(attackTypeMods)) {
            retVal += value;
         }
      }

      // Multi-attack
      if (multiAttack && conditionalRatingModifiers.multiAttack) {
         for (const value of Object.values(conditionalRatingModifiers.multiAttack)) {
            retVal += value;
         }
      }
   }
   return retVal;
}