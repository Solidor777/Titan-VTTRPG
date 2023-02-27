import { v4 as uuidv4 } from 'uuid';
import { isHTMLBlank, sortObjectsIntoContainerByKey } from '~/helpers/Utility';
import { camelize } from '../helpers/Utility';

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
         const selectorMessages = {};

         // Sort elements by key
         const keys = sortObjectsIntoContainerByKey(selectorElements, 'key');
         let camelizeMessages = false;
         switch (selector) {
            case 'customAttackTrait':
            case 'customItemTrait':
            case 'spellTradition': {
               camelizeMessages = true;
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
               selectorMessages[camelizeMessages ? camelize(key) : key] = keyMessages;
            }
         }

         if (Object.keys(selectorMessages).length > 0) {
            messages[selector] = selectorMessages;
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

export function getAttributeAndSkillRollMessages(attribute, skill) {
   // Attribute messages
   const message = [];
   if (attribute) {
      const attributeMessages = this.rollMessage?.attribute;
      if (attributeMessages) {
         const keyMessages = attributeMessages[attribute];
         if (keyMessages) {
            message.push(...keyMessages);
         }
      }
   }

   // Skill messages
   if (skill) {
      const skillMessages = this.rollMessage?.skill;
      if (skillMessages) {
         const keyMessages = skillMessages[skill];
         if (keyMessages) {
            message.push(...keyMessages);
         }
      }
   }

   return message.length > 0 ? message : false;
}

export function getResistanceRollMessages(resistance) {
   const message = [];
   const resistanceMessages = this.rollMessage?.resistance;
   if (resistanceMessages) {
      const keyMessages = resistanceMessages[resistance];
      if (keyMessages) {
         message.push(...keyMessages);
      }
   }

   return message.length > 0 ? message : false;
}

export function getAttackTypeAndTraitRollMessages(attack) {
   // Type messages
   const message = [];
   const typeMessages = this.rollMessage?.attackType;
   if (typeMessages) {
      const keyMessages = typeMessages[attack.type];
      if (keyMessages) {
         message.push(...keyMessages);
      }
   }

   // Trait messages
   const traitMessages = this.rollMessage?.attackTrait;
   if (traitMessages) {
      attack.trait.forEach((trait) => {
         const keyMessages = traitMessages[trait.name];
         if (keyMessages) {
            message.push(...keyMessages);
         }
      });
   }

   // Custom Trait messages
   const customTraitMesssages = this.rollMessage?.customAttackTrait;
   if (customTraitMesssages) {
      attack.customTrait.forEach((trait) => {
         const keyMessages = customTraitMesssages[camelize(trait.name)];
         if (keyMessages) {
            message.push(...keyMessages);
         }
      });
   }

   return message.length > 0 ? message : false;
}

export function getItemTraitRollMessages(customItemTraits) {
   const message = [];
   const customTraitMesssages = this.rollMessage?.customItemTrait;
   if (customTraitMesssages) {
      customItemTraits.forEach((trait) => {
         const keyMessages = customTraitMesssages[camelize(trait.name)];
         if (keyMessages) {
            message.push(...keyMessages);
         }
      });
   }

   return message.length > 0 ? message : false;
}

export function getSpellTraditionRollMessages(tradition) {
   const message = [];
   const traditionMessages = this.rollMessage?.spellTradition;
   if (traditionMessages) {
      console.log(traditionMessages);
      const keyMessages = traditionMessages[camelize(tradition)];
      if (keyMessages) {
         console.log(keyMessages);
         message.push(...keyMessages);
      }
   }

   return message.length > 0 ? message : false;
}