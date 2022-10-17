import { v4 as uuidv4 } from 'uuid';

export default function getStartOfTurnModStamTemplate(uuid) {
   return {
      operation: 'startOfTurnModStam',
      mod: 1,
      uuid: uuid ?? uuidv4()
   };
}