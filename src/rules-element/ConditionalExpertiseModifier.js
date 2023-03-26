import { v4 as uuidv4 } from 'uuid';
import { sortObjectsIntoContainerByKey } from '~/helpers/Utility';
import { camelize } from '~/helpers/Utility';

export function getConditionalExpertiseModifierTemplate(uuid, type) {
   return {
      operation: 'conditionalExpertiseModifier',
      checkType: 'any',
      selector: 'any',
      key: '',
      value: 1,
      uuid: uuid ?? uuidv4(),
      type: type ?? ''
   };
}

export function applyConditionalExpertiseModifierElements(elements) {
   if (elements.length > 0) {
      const conditionalExpertiseModifiers = {};
      // Sort elects by check type
      const checkTypes = sortObjectsIntoContainerByKey(elements, 'checkType');

      // For each check type
      for (const [checkType, checkTypeElements] of Object.entries(checkTypes)) {
         conditionalExpertiseModifiers[checkType] = {};
         const checkTypeMap = conditionalExpertiseModifiers[checkType];

         // Sort elements by selector
         const selectors = sortObjectsIntoContainerByKey(checkTypeElements, 'selector');

         // For each selector
         for (const [selector, selectorElements] of Object.entries(selectors)) {
            switch (selector) {
               // Special case handling for any and multi-attack
               case 'any':
               case 'multiAttack': {
                  checkTypeMap[selector] = 0;
                  for (const element of selectorElements) {
                     checkTypeMap[selector] += element.value;
                  }
                  break;
               }

               // Normal flow
               default: {
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

                  break;
               }
            }
         }
      }

      this.conditionalExpertiseModifier = conditionalExpertiseModifiers;
      return;
   }

   this.conditionalExpertiseModifier = false;
   return;
}

function getExpertiseMods(conditionalExpertiseModifiers, selector, key) {
   const selectorMods = conditionalExpertiseModifiers[selector];
   if (selectorMods) {
      const keyMod = selectorMods[key];
      if (keyMod) {
         return keyMod;
      }
   }

   return 0;
}

function getExpertiseModsForReducedKeys(conditionalExpertiseModifiers, selector, keys, reduceFunction) {
   let retVal = 0;
   const selectorMods = conditionalExpertiseModifiers[selector];
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

export function getAttackCheckExpertiseMod(item, attack, multiAttack) {
   // Normal mod is 0. Contaminated mod is -1.
   let retVal = this.parent.system.condition.contaminated ? -1 : 0;

   const expertiseMods = this.conditionalExpertiseModifier;
   if (expertiseMods) {
      // Any check expertise mods
      const anyCheckExpertiseMods = expertiseMods.any;
      if (anyCheckExpertiseMods) {

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
         retVal += getExpertiseModsForReducedKeys(anyCheckExpertiseMods, 'customTrait', customTraits, (trait) => (trait));

         // Get any mods
         if (anyCheckExpertiseMods.any) {
            retVal += anyCheckExpertiseMods.any;
         }
      }

      // Attack check expertise mods
      const attackCheckExpertiseMods = expertiseMods.attack;
      if (attackCheckExpertiseMods) {
         // Attribute
         retVal += getExpertiseMods(attackCheckExpertiseMods, 'attribute', attack.attribute);

         // Skill
         retVal += getExpertiseMods(attackCheckExpertiseMods, 'skill', attack.skill);

         // Attack Type
         retVal += getExpertiseMods(attackCheckExpertiseMods, 'attackType', attack.type);

         // Attack Traits
         retVal += getExpertiseModsForReducedKeys(attackCheckExpertiseMods, 'attackTrait', attack.trait, (trait) => trait.name);

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
         retVal += getExpertiseModsForReducedKeys(attackCheckExpertiseMods, 'customTrait', customTraits, (trait) => (trait));

         // Get multi attack mods
         if (multiAttack && attackCheckExpertiseMods.multiAttack) {
            retVal += attackCheckExpertiseMods.multiAttack;
         }

         // Get any mods
         if (attackCheckExpertiseMods.any) {
            retVal += attackCheckExpertiseMods.any;
         }
      }
   }

   return retVal;
}

export function getCastingCheckExpertiseMod(item) {
   // Normal mod is 0. Contaminated mod is -1.
   let retVal = this.parent.system.condition.contaminated ? -1 : 0;

   // If conditional expertise modifiers exist
   const expertiseMods = this.conditionalExpertiseModifier;
   if (expertiseMods) {

      // Any check expertise mods
      const anyCheckExpertiseMods = expertiseMods.any;
      if (anyCheckExpertiseMods) {

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

         retVal += getExpertiseModsForReducedKeys(anyCheckExpertiseMods, 'customTrait', customTraits, (trait) => (trait));

         // Get any mods
         if (anyCheckExpertiseMods.any) {
            retVal += anyCheckExpertiseMods.any;
         }
      }

      // Casting check expertise mods
      const castingCheckExpertiseMods = expertiseMods.casting;
      if (castingCheckExpertiseMods) {

         // Attribute
         retVal += getExpertiseMods(castingCheckExpertiseMods, 'attribute', item.system.castingCheck.attribute);

         // Skill
         retVal += getExpertiseMods(castingCheckExpertiseMods, 'skill', item.system.castingCheck.skill);

         // Spell tradition
         retVal += getExpertiseMods(castingCheckExpertiseMods, 'spellTradition', camelize(item.system.tradition));

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

         retVal += getExpertiseModsForReducedKeys(castingCheckExpertiseMods, 'customTrait', customTraits, (trait) => (trait));

         // Get any mods
         if (castingCheckExpertiseMods.any) {
            retVal += castingCheckExpertiseMods.any;
         }
      }
   }

   return retVal;
}

export function getItemCheckExpertiseMod(item, check) {
   // Normal mod is 0. Contaminated mod is -1.
   let retVal = this.parent.system.condition.contaminated ? -1 : 0;
   const expertiseMods = this.conditionalExpertiseModifier;
   if (expertiseMods) {

      // Any check expertise mods
      const anyCheckExpertiseMods = expertiseMods.any;
      if (anyCheckExpertiseMods) {

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

         retVal += getExpertiseModsForReducedKeys(anyCheckExpertiseMods, 'customTrait', customTraits, (trait) => (trait));

         // Get any mods
         if (anyCheckExpertiseMods.any) {
            retVal += anyCheckExpertiseMods.any;
         }
      }

      // Item check expertise mods
      const itemCheckExpertiseMods = expertiseMods.item;
      if (itemCheckExpertiseMods) {

         // Attribute
         retVal += getExpertiseMods(itemCheckExpertiseMods, 'attribute', check.attribute);

         // Skill
         retVal += getExpertiseMods(itemCheckExpertiseMods, 'skill', check.skill);

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

         retVal += getExpertiseModsForReducedKeys(itemCheckExpertiseMods, 'customTrait', customTraits, (trait) => (trait));

         // Get any mods
         if (itemCheckExpertiseMods.any) {
            retVal += itemCheckExpertiseMods.any;
         }
      }
   }

   return retVal;
}