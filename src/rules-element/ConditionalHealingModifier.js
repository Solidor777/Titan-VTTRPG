import { v4 as uuidv4 } from 'uuid';
import { sortObjectsIntoContainerByKey } from '~/helpers/Utility';
import { camelize } from '~/helpers/Utility';

export function getConditionalHealingModifierTemplate(uuid, type) {
   return {
      operation: 'conditionalHealingModifier',
      checkType: 'casting',
      selector: 'customTrait',
      key: '',
      value: 1,
      uuid: uuid ?? uuidv4(),
      type: type ?? ''
   };
}

export function applyConditionalHealingModifierElements(elements) {
   if (elements.length > 0) {
      const conditionalHealingModifiers = {};
      // Sort elects by check type
      const checkTypes = sortObjectsIntoContainerByKey(elements, 'checkType');

      // For each check type
      for (const [checkType, checkTypeElements] of Object.entries(checkTypes)) {
         conditionalHealingModifiers[checkType] = {};
         const checkTypeMap = conditionalHealingModifiers[checkType];

         // Sort elements by selector
         const selectors = sortObjectsIntoContainerByKey(checkTypeElements, 'selector');

         // For each selector
         for (const [selector, selectorElements] of Object.entries(selectors)) {
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

      this.conditionalHealingModifier = conditionalHealingModifiers;
      return;
   }

   this.conditionalHealingModifier = false;
   return;
}

function getHealingMods(conditionalHealingModifiers, selector, key) {
   const selectorMods = conditionalHealingModifiers[selector];
   if (selectorMods) {
      const keyMod = selectorMods[key];
      if (keyMod) {
         return keyMod;
      }
   }

   return 0;
}

function getHealingModsForReducedKeys(conditionalHealingModifiers, selector, keys, reduceFunction) {
   let retVal = 0;
   const selectorMods = conditionalHealingModifiers[selector];
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

export function getCastingCheckHealingMod(item) {
   let retVal = 0;

   // If conditional healing modifiers exist
   const healingMods = this.conditionalHealingModifier;
   if (healingMods) {

      // Any check healing mods
      const anyCheckHealingMods = healingMods.any;
      if (anyCheckHealingMods) {

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

         retVal += getHealingModsForReducedKeys(anyCheckHealingMods, 'customTrait', customTraits, (trait) => (trait));
      }

      // Casting check healing mods
      const castingCheckHealingMods = healingMods.casting;
      if (castingCheckHealingMods) {

         // Attribute
         retVal += getHealingMods(castingCheckHealingMods, 'attribute', item.system.castingCheck.attribute);

         // Skill
         retVal += getHealingMods(castingCheckHealingMods, 'skill', item.system.castingCheck.skill);

         // Spell tradition
         retVal += getHealingMods(castingCheckHealingMods, 'spellTradition', camelize(item.system.tradition));

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

         retVal += getHealingModsForReducedKeys(castingCheckHealingMods, 'customTrait', customTraits, (trait) => (trait));
      }
   }

   return retVal;
}

export function getItemCheckHealingMod(item, check) {
   let retVal = 0;

   // Check if the check has healing
   if (check.isHealing) {
      const healingMods = this.conditionalHealingModifier;
      if (healingMods) {

         // Any check healing mods
         const anyCheckHealingMods = healingMods.any;
         if (anyCheckHealingMods) {

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

            retVal += getHealingModsForReducedKeys(anyCheckHealingMods, 'customTrait', customTraits, (trait) => (trait));
         }

         // Item check healing mods
         const itemCheckHealingMods = healingMods.item;
         if (itemCheckHealingMods) {

            // Attribute
            retVal += getHealingMods(itemCheckHealingMods, 'attribute', check.attribute);

            // Skill
            retVal += getHealingMods(itemCheckHealingMods, 'skill', check.skill);

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
            retVal += getHealingModsForReducedKeys(itemCheckHealingMods, 'customTrait', customTraits, (trait) => (trait));
         }
      }
   }

   return retVal;
}