import { v4 as uuidv4 } from 'uuid';
import { sortObjectsIntoContainerByKey } from '~/helpers/Utility';

export function getTurnMessageTemplate(uuid) {
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

      this.conditionalDiceModifiers = conditionalDiceModifiers;
   }
   this.conditionalDiceModifiers = false;
   return;
}

export function getAttackBonusDie(attack) {
   let retVal = 0;

   // Attack type
   const attackTypeMods = this.conditionalDiceModifiers?.attackType;
   if (attackTypeMods) {
      const keyMod = attackType[attack.type];
      if (keyMod) {
         retVal += keyMod;
      }
   }

   // Attack trait
   const attackTraitMods = this.conditionalDiceModifiers?.attackCustomTrait;
   if (attackTraitMods) {
      const keyMod = attackTraitMods[attack.type];
      if (keyMod) {
         retVal += keyMod;
      }
   }

   // Attack custom trait
   const attackCustomTraitMods = this.conditionalDiceModifiers?.attackCustomTrait;
   if (attackCustomTraitMods) {
      const keyMod = attackCustomTraitMods[attack.type];
      if (keyMod) {
         retVal += keyMod;
      }
   }

   // Attack multi attack
   const attackMultiAttackMods = this.conditionalDiceModifiers?.attackCustomTrait;
   if (attackMultiAttackMods) {
      const keyMod = attackMultiAttackMods[attack.type];
      if (keyMod) {
         retVal += keyMod;
      }
   }

   return retVal;
}