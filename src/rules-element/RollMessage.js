import { v4 as uuidv4 } from 'uuid';
import { isHTMLBlank, sortObjectsIntoContainerByKey } from '~/helpers/Utility';
import { camelize } from '~/helpers/Utility';

export function getRollMessageTemplate(uuid) {
   return {
      operation: 'rollMessage',
      selector: 'attribute',
      key: 'body',
      message: '',
      uuid: uuid ?? uuidv4()
   };
}

export function applyRollMessageElements(elements) {
   if (elements.length > 0) {
      const messages = {};
      // Sort elements by selector
      const selectors = sortObjectsIntoContainerByKey(elements, 'selector');

      // For each selector
      for (const [selector, selectorElements] of Object.entries(selectors)) {

         // Handle special case for multi attack messages
         if (selector === 'multiAttack') {
            const selectorMessages = [];
            // Apply each message
            for (const element of selectorElements) {
               if (!isHTMLBlank(element.message)) {
                  selectorMessages.push(element.message);
               }
            }


            if (selectorMessages.length > 0) {
               messages[selector] = selectorMessages;
            }
         }

         else {
            const selectorMessages = {};
            // Sort elements by key
            const keys = sortObjectsIntoContainerByKey(selectorElements, 'key');
            let camelizeKeys = false;
            switch (selector) {
               case 'customAttackTrait':
               case 'customItemTrait':
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
                  if (!isHTMLBlank(element.message)) {
                     keyMessages.push(element.message);
                  }
               }

               if (keyMessages.length > 0) {
                  selectorMessages[camelizeKeys ? camelize(key) : key] = keyMessages;
               }
            }

            if (Object.keys(selectorMessages).length > 0) {
               messages[selector] = selectorMessages;
            }
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

export function getAttributeCheckMessages(check) {
   const rollMessages = this.rollMessage;
   if (rollMessages) {
      const message = [];

      // Attribute messages
      const attributeRollMessages = getRollMessages(rollMessages, 'attribute', check.parameters.attribute);
      if (attributeRollMessages) {
         message.push(...attributeRollMessages);
      }

      // Skill messages
      const skill = check.parameters.skill;
      if (skill && skill !== 'none') {
         const skillRollMessages = getRollMessages(rollMessages, 'skill', skill);
         if (skillRollMessages) {
            message.push(...skillRollMessages);
         }
      }

      return message.length > 0 ? message : false;
   }

   return false;
}

export function getResistanceCheckMessages(check) {
   const rollMessages = this.rollMessage;
   if (rollMessages) {
      return getRollMessages(rollMessages, 'resistence', check.parameters.resistance);
   }

   return false;
}

export function getAttackCheckMessages(check) {
   const rollMessages = this.rollMessage;
   if (rollMessages) {
      const message = [];

      // Attribute messages
      const attributeRollMessages = getRollMessages(rollMessages, 'attribute', check.parameters.attribute);
      if (attributeRollMessages) {
         message.push(...attributeRollMessages);
      }

      // Skill messages
      const skillRollMessages = getRollMessages(rollMessages, 'skill', check.parameters.skill);
      if (skillRollMessages) {
         message.push(...skillRollMessages);
      }

      // Type messages
      const typeMessages = getRollMessages(rollMessages, 'attackType', check.parameters.attack.type);
      if (typeMessages) {
         message.push(...typeMessages);
      }

      // Attack Trait messages
      const attackTraitMessages = getRollMessagesForReducedKeys(rollMessages, 'attackTrait', check.parameters.attack.trait, (trait) => trait.name);
      if (attackTraitMessages) {
         message.push(...attackTraitMessages);
      }

      // Attack Trait messages
      const customAttackTraitMessages = getRollMessagesForReducedKeys(rollMessages, 'customAttackTrait', check.parameters.attack.customTrait, (trait) => camelize(trait.name));
      if (customAttackTraitMessages) {
         message.push(...customAttackTraitMessages);
      }

      // Multi Attack messages
      if (check.parameters.multiAttack && rollMessages.multiAttack) {
         message.push(...rollMessages.multiAttack);
      }

      // Custom Item Trait messages
      const customItemTraitMessages = getRollMessagesForReducedKeys(rollMessages, 'customItemTrait', check.parameters.itemTrait, (trait) => camelize(trait.name));
      if (customItemTraitMessages) {
         message.push(...customItemTraitMessages);
      }

      return message.length > 0 ? message : false;
   }

   return false;
}

export function getCastingCheckMessages(check) {
   const rollMessages = this.rollMessage;
   if (rollMessages) {
      const message = [];

      // Attribute messages
      const attributeRollMessages = getRollMessages(rollMessages, 'attribute', check.parameters.attribute);
      if (attributeRollMessages) {
         message.push(...attributeRollMessages);
      }

      // Skill messages
      const skillRollMessages = getRollMessages(rollMessages, 'skill', check.parameters.skill);
      if (skillRollMessages) {
         message.push(...skillRollMessages);
      }

      // Custom Item Trait messages
      const customItemTraitMessages = getRollMessagesForReducedKeys(rollMessages, 'customItemTrait', check.parameters.itemTrait, (trait) => camelize(trait.name));
      if (customItemTraitMessages) {
         message.push(...customItemTraitMessages);
      }

      // Spell Tradition messages
      const spellTraditionMessages = getRollMessages(rollMessages, 'spellTradition', camelize(check.parameters.tradition));
      if (spellTraditionMessages) {
         message.push(...spellTraditionMessages);
      }

      return message.length > 0 ? message : false;
   }

   return false;
}

export function getItemCheckMessages(check) {
   const rollMessages = this.rollMessage;
   if (rollMessages) {
      const message = [];

      // Attribute messages
      const attributeRollMessages = getRollMessages(rollMessages, 'attribute', check.parameters.attribute);
      if (attributeRollMessages) {
         message.push(...attributeRollMessages);
      }

      // Skill messages
      const skillRollMessages = getRollMessages(rollMessages, 'skill', check.parameters.skill);
      if (skillRollMessages) {
         message.push(...skillRollMessages);
      }

      // Custom Item Trait messages
      const customItemTraitMessages = getRollMessagesForReducedKeys(rollMessages, 'customItemTrait', check.parameters.itemTrait, (trait) => camelize(trait.name));
      if (customItemTraitMessages) {
         message.push(...customItemTraitMessages);
      }

      return message.length > 0 ? message : false;
   }

   return false;
}