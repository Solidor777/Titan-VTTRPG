import { TitanWeapon } from "./weapon/Weapon";
import { TitanSpell } from "./spell/Spell";

export class TitanItem extends Item {
   prepareDerivedData() {
      // Prepare universal character data

      // Create type component if necessary
      if (!this.system.typeComponent) {
         switch (this.type) {
            // Spell
            case "spell": {
               this.typeComponent = new TitanSpell(this);
               this.spell = this.typeComponent;
               break;
            }

            // Weapon
            case "weapon": {
               this.typeComponent = new TitanWeapon(this);
               this.weapon = this.typeComponent;
               break;
            }

            default: {
               break;
            }
         }
      }

      // Prepare type specific data
      if (this.typeComponent) {
         this.typeComponent.prepareDerivedData();
      }

      return;
   }

   async sendToChat(options) {

      // Create the context object
      const chatContext = {
         type: this.type,
         img: this.img,
         name: this.name,
         flags: this.flags,
         system: this.system,
      };

      // Create and post the message
      return await ChatMessage.create(
         ChatMessage.applyRollMode(
            {
               user: options?.user ? options.user : game.user.id,
               speaker: options?.speaker ? options.speaker : null,
               type: CONST.CHAT_MESSAGE_TYPES.OTHER,
               sound: CONFIG.sounds.notification,
               flags: {
                  titan: {
                     chatContext: chatContext
                  }
               }
            },
            options?.rollMode ?
               options.rollMode :
               game.settings.get("core", "rollMode")
         )
      );
   }

   getRollData() {
      let rollData = super.getRollData();
      rollData.name = this.name;
      if (this.typeComponent) {
         rollData = this.typeComponent.getRollData(rollData);
      }

      return rollData;
   }
}
