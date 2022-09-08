import { TitanTypeComponent } from "~/helpers/TypeComponent.js";

export function
   getCheckTemplate() {
   return {
      label: game.i18n.localize("LOCAL.check.label"),
      resolveCost: 0,
      opposedCheck: {
         enabled: false,
         ability: "body",
         skill: "athletics"
      },
      resistanceCheck: "none",
      isDamage: false,
      isHealing: false,
      initialValue: 1,
      scaling: true,
   };
}

export class TitanAbility extends TitanTypeComponent {

   async addCheck() {
      const retVal = this.parent.system.checks.push(getCheckTemplate());
      await this.parent.update({
         system: this.parent.system
      });

      return retVal - 1;
   }

   async removeCheck(idx) {
      this.parent.system.checks.splice(idx, 1);
      return await this.parent.update({
         system: this.parent.system
      });
   }
}