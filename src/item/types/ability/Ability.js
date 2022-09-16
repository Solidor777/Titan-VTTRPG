import TitanTypeComponent from "~/helpers/TypeComponent";

function getCheckTemplate() {
   return {
      label: game.i18n.localize("LOCAL.check.label"),
      attribute: "body",
      skill: "athletics",
      difficulty: 4,
      complexity: 1,
      resolveCost: 0,
      isDamage: false,
      isHealing: false,
      initialValue: 1,
      scaling: true,
      resistanceCheck: "none",
      opposedCheck: {
         enabled: false,
         attribute: "body",
         skill: "athletics"
      },
   };
}

export default class TitanAbility extends TitanTypeComponent {

   async addCheck() {
      const retVal = this.parent.system.check.push(getCheckTemplate());
      await this.parent.update({
         system: this.parent.system
      });

      return retVal - 1;
   }

   async removeCheck(idx) {
      this.parent.system.check.splice(idx, 1);
      return await this.parent.update({
         system: this.parent.system
      });
   }
}