import { v4 as uuidv4 } from 'uuid';

export default function getTurnStartStaminaTemplate(uuid) {
   return {
      operation: 'turnStartStamina',
      mod: 1,
      uuid: uuid ?? uuidv4()
   };
}