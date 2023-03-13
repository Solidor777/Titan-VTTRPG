import { v4 as uuidv4 } from 'uuid';
import { isHTMLBlank, sortObjectsIntoContainerByKey } from '~/helpers/Utility';
import { camelize } from '~/helpers/Utility';
import { appendUnique } from '../helpers/Utility';

export function getRollMessageTemplate(uuid, type) {
   return {
      operation: 'rollMessage',
      checkType: 'any',
      selector: 'attribute',
      key: 'body',
      message: '',
      uuid: uuid ?? uuidv4(),
      type: type ?? ''
   };
}

export function applyRollMessageElements(elements) {
   if (elements.length > 0) {
      const messages = {};

      // Sort elements by check type
      const checkTypes = sortObjectsIntoContainerByKey(elements, 'checkType');
      for (const [checkType, checkTypeElements] of Object.entries(checkTypes)) {
         const checkTypeMessages = {};


         // Sort elements by selector
         const selectors = sortObjectsIntoContainerByKey(checkTypeElements, 'selector');

         // For each selector
         for (const [selector, selectorElements] of Object.entries(selectors)) {

            // Handle special case for any and multi attack messages
            if (selector === 'multiAttack' || selector === 'any') {
               const selectorMessages = [];
               // Apply each message
               for (const element of selectorElements) {
                  if (!isHTMLBlank(element.message)) {
                     selectorMessages.push(element.message);
                  }
               }

               if (selectorMessages.length > 0) {
                  checkTypeMessages[selector] = selectorMessages;
               }
            }

            else {
               const selectorMessages = {};
               // Sort elements by key
               const keys = sortObjectsIntoContainerByKey(selectorElements, 'key');
               let camelizeKeys = false;
               switch (selector) {
                  case 'customTrait':
                  case 'spellTradition': {
                     camelizeKeys = true;
                     break;
                  }
                  default: {
                     break;
                  }
               }

               // For each key
               for (const [key, keyElements] of Object.entries(keys)) {
                  const keyMessages = [];

                  // Apply each message
                  for (const element of keyElements) {
                     if (!isHTMLBlank(element.message) && keyMessages.indexOf(element.message) < 0) {
                        keyMessages.push(element.message);
                     }
                  }

                  if (keyMessages.length > 0) {
                     selectorMessages[camelizeKeys ? camelize(key) : key] = keyMessages;
                  }
               }

               if (Object.keys(selectorMessages).length > 0) {
                  checkTypeMessages[selector] = selectorMessages;
               }
            }


         }


         if (Object.keys(checkTypeMessages).length > 0) {
            messages[checkType] = checkTypeMessages;
         }
      }

      if (Object.keys(messages).length > 0) {
         this.rollMessage = messages;
         return;
      }
   }

   this.rollMessage = false;
   return;
}

export function getAttributeCheckMessages(check) {
   const messages = [];

   const anyMessages = this.rollMessage?.any;
   if (anyMessages) {

      // Any messages
      getAnyMessages(anyMessages, check, messages);

      // Attribute
      getAttributeMessages(anyMessages, check, messages);

      // Skill
      const skill = check.parameters.skill;
      if (skill && skill !== 'none') {
         getSkillMessages(anyMessages, check, messages);
      }
   }

   const attributeMessages = this.rollMessage?.attribute;
   if (attributeMessages) {

      // Any messages
      getAnyMessages(attributeMessages, check, messages);

      // Attribute
      getAttributeMessages(attributeMessages, check, messages);

      // Skill
      const skill = check.parameters.skill;
      if (skill && skill !== 'none') {
         getSkillMessages(attributeMessages, check, messages);
      }
   }

   return messages.length > 0 ? messages : false;
}

export function getResistanceCheckMessages(check) {
   const messages = [];

   // Any messages
   const anyMessages = this.rollMessage?.any;
   if (anyMessages) {

      // Any messages
      getAnyMessages(anyMessages, check, messages);
   }

   // Resistance messages
   const resistanceMessages = this.rollMessage?.resistance;
   if (resistanceMessages) {

      // Any messages
      getAnyMessages(resistanceMessages, check, messages);

      // Resistance messages
      getResistanceMessages(resistanceMessages, check, messages);
   }

   return messages.length > 0 ? messages : false;
}

export function getAttackCheckMessages(check) {
   const messages = [];

   // Get any type messages
   const anyMessages = this.rollMessage?.any;
   if (anyMessages) {

      // Any messages
      getAnyMessages(anyMessages, check, messages);

      // Attribute
      getAttributeMessages(anyMessages, check, messages);

      // Skill
      getSkillMessages(anyMessages, check, messages);

      // Custom Item Trait
      getCustomItemTraitMessages(anyMessages, check, messages);

      // Custom attack trait
      getCustomAttackTraitMessages(anyMessages, check, messages);
   }

   // Get attack type messages
   const attackMessages = this.rollMessage?.attack;
   if (attackMessages) {

      // Any messages
      getAnyMessages(attackMessages, check, messages);

      // Attribute
      getAttributeMessages(attackMessages, check, messages);

      // Skill
      getSkillMessages(attackMessages, check, messages);

      // Attack type
      getAttackTypeMessages(attackMessages, check, messages);

      // Attack Traits
      getAttackTraitMessages(attackMessages, check, messages);

      // Custom Attack Trait
      getCustomAttackTraitMessages(attackMessages, check, messages);

      // Custom Item Trait
      getCustomItemTraitMessages(attackMessages, check, messages);

      // Multi Attack
      getMultiAttackMessages(attackMessages, check, messages);
   }

   return messages.length > 0 ? messages : false;
}

export function getCastingCheckMessages(check) {
   const messages = [];

   // Get any type messages
   const anyMessages = this.rollMessage?.any;
   if (anyMessages) {

      // Any messages
      getAnyMessages(anyMessages, check, messages);

      // Attribute
      getAttributeMessages(anyMessages, check, messages);

      // Skill
      getSkillMessages(anyMessages, check, messages);

      // Custom Item Trait
      getCustomItemTraitMessages(anyMessages, check, messages);
   }

   // Get casting check messages
   const castingMessages = this.rollMessage?.casting;
   if (castingMessages) {

      // Any messages
      getAnyMessages(castingMessages, check, messages);

      // Attribute
      getAttributeMessages(castingMessages, check, messages);

      // Skill
      getSkillMessages(castingMessages, check, messages);

      // Custom Item Trait
      getCustomItemTraitMessages(castingMessages, check, messages);

      // Spell Tradition
      getSpellTraditionMessages(castingMessages, check, messages);
   }

   return messages.length > 0 ? messages : false;
}

export function getItemCheckMessages(check) {
   const messages = [];

   // Get any type messages
   const anyMessages = this.rollMessage?.any;
   if (anyMessages) {

      // Any messages
      getAnyMessages(anyMessages, check, messages);

      // Attribute
      getAttributeMessages(anyMessages, check, messages);

      // Skill
      getSkillMessages(anyMessages, check, messages);

      // Custom Item Trait
      getCustomItemTraitMessages(anyMessages, check, messages);
   }

   // Get casting check messages
   const itemMessages = this.rollMessage?.item;
   if (itemMessages) {

      // Any messages
      getAnyMessages(itemMessages, check, messages);

      // Attribute
      getAttributeMessages(itemMessages, check, messages);

      // Skill
      getSkillMessages(itemMessages, check, messages);

      // Custom Item Trait
      getCustomItemTraitMessages(itemMessages, check, messages);
   }

   return messages.length > 0 ? messages : false;
}

function getRollMessages(rollMessages, selector, key) {
   const selectorMessages = rollMessages[selector];
   if (selectorMessages) {
      const keyMessages = selectorMessages[key];
      if (keyMessages) {
         return keyMessages;
      }
   }

   return false;
}

function getRollMessagesForReducedKeys(rollMessages, selector, keys, reduceFunction) {
   const messages = [];
   const selectorMessages = rollMessages[selector];
   if (selectorMessages) {
      keys.forEach((key) => {
         const keyMessages = selectorMessages[reduceFunction(key)];
         if (keyMessages) {
            messages.push(...keyMessages);
         }
      });
   }

   return messages.length > 0 ? messages : false;
}

function getAttributeMessages(categoryMessages, check, messages) {
   const attributeRollMessages = getRollMessages(categoryMessages, 'attribute', check.parameters.attribute);
   if (attributeRollMessages) {
      appendUnique(messages, attributeRollMessages);
   }
}

function getSkillMessages(categoryMessages, check, messages) {
   const skillRollMessages = getRollMessages(categoryMessages, 'skill', check.parameters.skill);
   if (skillRollMessages) {
      appendUnique(messages, skillRollMessages);
   }
}

function getResistanceMessages(categoryMessages, check, messages) {
   const resistanceRollMessages = getRollMessages(categoryMessages, 'resistance', check.parameters.resistance);
   if (resistanceRollMessages) {
      appendUnique(messages, resistanceRollMessages);
   }
}

function getAttackTypeMessages(categoryMessages, check, messages) {
   const attackTypeMessages = getRollMessages(categoryMessages, 'attackType', check.parameters.attack.type);
   if (attackTypeMessages) {
      appendUnique(messages, attackTypeMessages);
   }
}

function getAttackTraitMessages(categoryMessages, check, messages) {
   const attackTraitMessages = getRollMessagesForReducedKeys(categoryMessages, 'attackTrait', check.parameters.attack.trait, (trait) => trait.name);
   if (attackTraitMessages) {
      appendUnique(messages, attackTraitMessages);
   }
}

function getCustomAttackTraitMessages(categoryMessages, check, messages) {
   const customAttackTraitMessages = getRollMessagesForReducedKeys(categoryMessages, 'customTrait', check.parameters.attack.customTrait, (trait) => camelize(trait.name));
   if (customAttackTraitMessages) {
      appendUnique(messages, customAttackTraitMessages);
   }
}

function getCustomItemTraitMessages(categoryMessages, check, messages) {
   const customItemTraitMessages = getRollMessagesForReducedKeys(categoryMessages, 'customTrait', check.parameters.itemTrait, (trait) => camelize(trait.name));
   if (customItemTraitMessages) {
      appendUnique(messages, customItemTraitMessages);
   }
}

function getMultiAttackMessages(categoryMessages, check, messages) {
   if (check.parameters.multiAttack && categoryMessages.multiAttack) {
      appendUnique(messages, categoryMessages.multiAttack);
   }
}

function getSpellTraditionMessages(categoryMessages, check, messages) {
   const spellTraditionMessages = getRollMessages(categoryMessages, 'spellTradition', camelize(check.parameters.tradition));
   if (spellTraditionMessages) {
      messages.push(...spellTraditionMessages);
   }
}

function getAnyMessages(categoryMessages, check, messages) {
   if (categoryMessages.any) {
      appendUnique(messages, categoryMessages.any);
   }
}