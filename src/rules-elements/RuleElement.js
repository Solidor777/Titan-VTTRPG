export function getRuleElementTemplate() {
   return {
      operation: "flatModifier",
      selector: "body",
      value: 1,
      type: "effect",
   };
}

export function applyRuleElement(element, actorData) {
   // Protect against bad input
   if (element === undefined ||
      element.operation === undefined ||
      element.selector === undefined ||
      element.type === undefined ||
      element.value === undefined) {
      console.error(`TITAN | Error applying Rule Element. Invalid Element (${element})`);
      return;
   }

   // Select the appropriate element
   switch (element.operation) {
      case "flatModifier": {
         flatM
      }
      default: {
         console.error(`TITAN | Error applying Rule Element. Invalid Operation (${element.operation})`);
         return;
      }
   }
}