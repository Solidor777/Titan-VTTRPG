function getRuleElementTemplate() {
   return {
      operation: 'flatModifier',
      selector: 'attribute',
      key: 'body',
      value: 1,
      type: 'effect',
   };
}

export async function addRuleElement(document) {
   document.system.rulesElement.push(getRuleElementTemplate());
   await document.update({
      system: document.system
   });

   return;
}

export async function removeRuleElement(document, idx) {
   document.system.rulesElement.splice(idx, 1);
   await document.update({
      system: document.system
   });

   return;
}