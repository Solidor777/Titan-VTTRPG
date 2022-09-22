import { v4 as uuidv4 } from 'uuid';
import { localize } from "~/helpers/Utility.js";

function getCheckTemplate() {
   return {
      label: localize('check'),
      attribute: 'body',
      skill: 'athletics',
      difficulty: 4,
      complexity: 1,
      resolveCost: 0,
      isDamage: false,
      isHealing: false,
      initialValue: 1,
      scaling: true,
      resistanceCheck: 'none',
      opposedCheck: {
         enabled: false,
         attribute: 'body',
         skill: 'athletics'
      },
      uuid: uuidv4()
   };
}

export async function addCheck() {
   this.parent.system.check.push(getCheckTemplate());
   return await this.parent.update({
      system: this.parent.system
   });
}

export async function removeCheck(idx) {
   this.parent.system.check.splice(idx, 1);
   return await this.parent.update({
      system: this.parent.system
   });
}