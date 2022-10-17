import { v4 as uuidv4 } from 'uuid';

export default function getTurnStartMessageTemplate(uuid) {
   return {
      operation: 'turnStartMessage',
      message: '',
      uuid: uuid ?? uuidv4()
   };
}