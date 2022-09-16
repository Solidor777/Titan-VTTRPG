import flatModifier from './FlatModifier';

export function getRuleElementTemplate() {
   return {
      operation: 'flatModifier',
      selector: 'attribute',
      key: 'body',
      value: 1,
      type: 'effect',
   };
}

export function applyRuleElement(element, actorData) {
   // Protect against bad input
   if (element === undefined ||
      element.operation === undefined ||
      element.selector === undefined ||
      element.key === undefined ||
      element.type === undefined ||
      element.value === undefined) {
      console.error(`TITAN | Error applying Rule Element. Invalid Element (${element})`);
      return;
   }

   // Select the appropriate element
   switch (element.operation) {
      case 'flatModifier': {
         if (!flatModifier(element.selector, element.key, element.value, actorData)) {
            console.error(`TITAN | Error applying Flat Modifier.`);
            return false;
         }

         break;
      }
      default: {
         console.error(`TITAN | Error applying Rule Element. Invalid Operation (${element.operation})`);
         return;
      }
   }
}