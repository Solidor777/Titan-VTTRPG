import { v4 as uuidv4 } from 'uuid';
import { isHTMLBlank, sortObjectsIntoContainerByKey } from '~/helpers/Utility';

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
               selectorMessages[key] = keyMessages;
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