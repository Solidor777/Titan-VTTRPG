import { v4 as uuidv4 } from 'uuid';
import sortAndApplyElementsToModObject from './RulesElement';

export function getFlatModifierTemplate(uuid) {
   return {
      operation: 'flatModifier',
      selector: 'attribute',
      key: 'body',
      value: 1,
      uuid: uuid ?? uuidv4()
   };
}

export function applyFlatModifierElements(flatModifierElements) {
   return sortAndApplyElementsToModObject(this.parent, flatModifierElements, (modObject, type, elementValue) => {
      modObject[type] += elementValue;
   });
}