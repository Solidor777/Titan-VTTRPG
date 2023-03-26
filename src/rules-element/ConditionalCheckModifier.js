import { v4 as uuidv4 } from 'uuid';
import { sortObjectsIntoContainerByKey } from '~/helpers/Utility';
import { camelize } from '~/helpers/Utility';

export function getConditionalDamageModifierTemplate(uuid, type) {
   return {
      operation: 'conditionalDamageModifier',
      checkType: 'any',
      selector: 'any',
      key: '',
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

   const damageMods = this.conditionalDamageModifier;
   if (damageMods) {
      // Any check damage mods
      const anyCheckDamageMods = damageMods.any;
      if (anyCheckDamageMods) {

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
         retVal += getDamageModsForReducedKeys(anyCheckDamageMods, 'customTrait', customTraits, (trait) => (trait));

         // Get any mods
         if (anyCheckDamageMods.any) {
            retVal += anyCheckDamageMods.any;
         }
      }

      // Attack check damage mods
      const attackCheckDamageMods = damageMods.attack;
      if (attackCheckDamageMods) {
         // Attribute
         retVal += getDamageMods(attackCheckDamageMods, 'attribute', attack.attribute);

         // Skill
         retVal += getDamageMods(attackCheckDamageMods, 'skill', attack.skill);

         // Attack Type
         retVal += getDamageMods(attackCheckDamageMods, 'attackType', attack.type);

         // Attack Traits
         retVal += getDamageModsForReducedKeys(attackCheckDamageMods, 'attackTrait', attack.trait, (trait) => trait.name);

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
         retVal += getDamageModsForReducedKeys(attackCheckDamageMods, 'customTrait', customTraits, (trait) => (trait));

         // Get multi attack mods
         if (multiAttack && attackCheckDamageMods.multiAttack) {
            retVal += attackCheckDamageMods.multiAttack;
         }

         // Get any mods
         if (attackCheckDamageMods.any) {
            retVal += attackCheckDamageMods.any;
         }
      }
   }

   return retVal;
}

export function getCastingCheckDamageMod(item) {
   // Normal mod is 0. Contaminated mod is -1.
   let retVal = this.parent.system.condition.contaminated ? -1 : 0;

   // If conditional damage modifiers exist
   const damageMods = this.conditionalDamageModifier;
   if (damageMods) {

      // Any check damage mods
      const anyCheckDamageMods = damageMods.any;
      if (anyCheckDamageMods) {

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

         retVal += getDamageModsForReducedKeys(anyCheckDamageMods, 'customTrait', customTraits, (trait) => (trait));

         // Get any mods
         if (anyCheckDamageMods.any) {
            retVal += anyCheckDamageMods.any;
         }
      }

      // Casting check damage mods
      const castingCheckDamageMods = damageMods.casting;
      if (castingCheckDamageMods) {

         // Attribute
         retVal += getDamageMods(castingCheckDamageMods, 'attribute', item.system.castingCheck.attribute);

         // Skill
         retVal += getDamageMods(castingCheckDamageMods, 'skill', item.system.castingCheck.skill);

         // Spell tradition
         retVal += getDamageMods(castingCheckDamageMods, 'spellTradition', camelize(item.system.tradition));

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

         retVal += getDamageModsForReducedKeys(castingCheckDamageMods, 'customTrait', customTraits, (trait) => (trait));

         // Get any mods
         if (castingCheckDamageMods.any) {
            retVal += castingCheckDamageMods.any;
         }
      }
   }

   return retVal;
}

export function getItemCheckDamageMod(item, check) {
   // Normal mod is 0. Contaminated mod is -1.
   let retVal = this.parent.system.condition.contaminated ? -1 : 0;
   const damageMods = this.conditionalDamageModifier;
   if (damageMods) {

      // Any check damage mods
      const anyCheckDamageMods = damageMods.any;
      if (anyCheckDamageMods) {

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

         retVal += getDamageModsForReducedKeys(anyCheckDamageMods, 'customTrait', customTraits, (trait) => (trait));

         // Get any mods
         if (anyCheckDamageMods.any) {
            retVal += anyCheckDamageMods.any;
         }
      }

      // Item check damage mods
      const itemCheckDamageMods = damageMods.item;
      if (itemCheckDamageMods) {

         // Attribute
         retVal += getDamageMods(itemCheckDamageMods, 'attribute', check.attribute);

         // Skill
         retVal += getDamageMods(itemCheckDamageMods, 'skill', check.skill);

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

         retVal += getDamageModsForReducedKeys(itemCheckDamageMods, 'customTrait', customTraits, (trait) => (trait));

         // Get any mods
         if (itemCheckDamageMods.any) {
            retVal += itemCheckDamageMods.any;
         }
      }
   }

   return retVal;
}