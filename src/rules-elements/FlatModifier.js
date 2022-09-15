export default function flatModifier(selector, value, actorData) {
   function applyModifier(valueObject) {
      if (valueObject.dynamicMod === undefined) {
         valueObject.dynamicMod = value;
      }
      else if (valueObject.dynamicMod + value !== undefined) {
         valueObject.dynamicMod += value;
      }
      else {
         console.error(`TITAN | Error applying Flat Modifier. Invalid Value provided. (${value})`);
         return false;
      }
      return true;
   }

   // Switch depending on the selector
   switch (selector) {
      case "body":
      case "mind":
      case "soul": {
         return applyModifier(actorData.attribute[selector]);
      }
      case "reflexes":
      case "resilience":
      case "willpower": {
         return applyModifier(actorData.skill[selector]);
      }
      default: {
         console.error(`TITAN | Error applying Flat Modifier. Invalid Selector (${selector})`);
         return false;
      }
   }
}