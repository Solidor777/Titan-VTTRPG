import { v4 as uuidv4 } from 'uuid';
import { sortObjectsIntoContainerByKey } from '~/helpers/Utility';
import { camelize } from '~/helpers/Utility';

export function getConditionalDiceModifierTemplate(uuid) {
   return {
      operation: 'conditionalDiceModifier',
      selector: 'attackType',
      key: 'melee',
      value: 1,
      uuid: uuid ?? uuidv4(),
   };
}

export function applyConditionalDiceModifierElements(elements) {
   if (elements.length > 0) {
      const conditionalDiceModifiers = {};
      // Sort elements by selector
      const selectors = sortObjectsIntoContainerByKey(elements, 'selector');

      // For each selector
      for (const [selector, selectorElements] of Object.entries(selectors)) {
         conditionalDiceModifiers[selector] = {};
         const selectorMap = conditionalDiceModifiers[selector];

         // Sort elements by key
         const keys = sortObjectsIntoContainerByKey(selectorElements, 'key');

         // For each key
         for (const [key, keyElements] of Object.entries(keys)) {

            // Initialize key value
            selectorMap[key] = 0; {

               // For each element
               for (const element of keyElements) {

                  // Add to the key value
                  selectorMap[key] += element.value;
               }
            }
         }
      }

      this.conditionalDiceModifier = conditionalDiceModifiers;
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

export function getAttackDiceMod(attack, multiAttack) {
   let retVal = 0;
   const conditionalDiceModifiers = this.getConditionalDiceModifier;
   if (conditionalDiceModifiers) {
      retVal += getDiceMods(conditionalDiceModifiers, 'attackType', attack.type);
      retVal += getDicedModsForReducedKeys(conditionalDiceModifiers, 'attackTrait', attack.trait, (trait) => trait.name);
      retVal += getDicedModsForReducedKeys(conditionalDiceModifiers, 'customAttackTrait', attack.customTrait, (trait) => camelize(trait.name));
      if (multiAttack && conditionalDiceModifiers.multiAttack) {
         retVal += conditionalDiceModifiers.multiAttack;
      }
   }

   return retVal;
}