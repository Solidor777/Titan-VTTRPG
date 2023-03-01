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
      type: type ?? ''
   };
}

export function applyConditionalDiceModifierElements(elements) {
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
                     case 'customItemTrait':
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

         this.conditionalRatingModifier = conditionalRatingModifiers;
         return;
      }
   }

   this.conditionalRatingModifier = false;
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

function getDicedModsForReducedKeys(conditionalDiceModifiers, selector, keys, reduceFunction) {
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
   let retVal = 0;
   const conditionalDiceModifiers = this.conditionalDiceModifier;
   if (conditionalDiceModifiers) {
      retVal += getDiceMods(conditionalDiceModifiers, 'attackType', attack.type);
      retVal += getDicedModsForReducedKeys(conditionalDiceModifiers, 'attackTrait', attack.trait, (trait) => trait.name);
      retVal += getDicedModsForReducedKeys(conditionalDiceModifiers, 'customAttackTrait', attack.customTrait, (trait) => camelize(trait.name));
      retVal += getDicedModsForReducedKeys(conditionalDiceModifiers, 'customItemTrait', item.system.customTrait, (trait) => camelize(trait.name));
      if (multiAttack && conditionalDiceModifiers.multiAttack) {
         retVal += conditionalDiceModifiers.multiAttack;
      }
   }

   return retVal;
}

export function getCastingCheckDiceMod(item) {
   let retVal = 0;
   const conditionalDiceModifiers = this.conditionalDiceModifier;
   if (conditionalDiceModifiers) {
      retVal += getDiceMods(conditionalDiceModifiers, 'spellTradition', camelize(item.system.tradition));
      retVal += getDicedModsForReducedKeys(conditionalDiceModifiers, 'customItemTrait', item.system.customTrait, (trait) => camelize(trait.name));
   }

   return retVal;
}

export function getItemCheckDiceMod(item) {
   let retVal = 0;
   const conditionalDiceModifiers = this.conditionalDiceModifier;
   if (conditionalDiceModifiers) {
      retVal += getDicedModsForReducedKeys(conditionalDiceModifiers, 'customItemTrait', item.system.customTrait, (trait) => camelize(trait.name));
   }

   return retVal;
}