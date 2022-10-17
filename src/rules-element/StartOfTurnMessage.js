import { v4 as uuidv4 } from 'uuid';

export default function getStartOfTurnMessageTemplate(uuid) {
   return {
      operation: 'startOfTurnMessage',
      message: '',
      uuid: uuid ?? uuidv4()
   };
}