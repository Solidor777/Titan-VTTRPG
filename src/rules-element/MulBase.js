import { v4 as uuidv4 } from 'uuid';
import sortAndApplyElementsToModObject from './RulesElement';

export function getMulBaseTemplate(uuid) {
   return {
      operation: 'mulBase',
      selector: 'attribute',
      key: 'body',
      value: 2,
      uuid: uuid ?? uuidv4()
   };
}

export function applyMulBaseElements(mulBaseElements) {
   return sortAndApplyElementsToModObject(this.parent, mulBaseElements, (modObject, type, elementValue, baseValue) => {
      modObject[type] += baseValue * (elementValue - 1);
   });
}