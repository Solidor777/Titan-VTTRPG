import { getFlatModifierTemplate } from '../rules-element/FlatModifier.js';
import TitanAbility from './types/ability/Ability.js';
import TitanEffect from './types/effect/Effect.js';
import TitanSpell from './types/spell/Spell.js';
import TitanWeapon from './types/weapon/Weapon.js';

export default class TitanItem extends Item {


   prepareDerivedData() {
      // Create type component if necessary
      if (!this.typeComponent) {
         this._initializeTypeComponent();
      }

      // Prepare type specific data
      if (this.typeComponent) {
         this.typeComponent.prepareDerivedData();
      }

      return;
   }

   _initializeTypeComponent() {
      switch (this.type) {
         // Ability
         case 'ability': {
            this.typeComponent = new TitanAbility(this);
            this.ability = this.typeComponent;
            break;
         }

         // Effect
         case 'effect': {
            this.typeComponent = new TitanEffect(this);
            this.effect = this.typeComponent;
            break;
         }

         // Spell
         case 'spell': {
            this.typeComponent = new TitanSpell(this);
            this.spell = this.typeComponent;
            break;
         }

         // Weapon
         case 'weapon': {
            this.typeComponent = new TitanWeapon(this);
            this.weapon = this.typeComponent;
            break;
         }

         default: {
            break;
         }
      }
   }

   _onCreate(data, options, userId) {
      super._onCreate(data, options, userId);
      this._initializeTypeComponent();
      if (this.typeComponent) {
         this.typeComponent.onCreate();
      }
   }

   _onDelete(options, userId) {
      if (this.typeComponent) {
         this.typeComponent.onDelete();
      }
      super._onDelete(options, userId);
   }

   async sendToChat(options) {
      // Create the context object
      let chatContext = {
         type: this.type,
         img: this.img,
         name: this.name,
         flags: this.flags,
         system: this.system,
      };

      if (this.typeComponent) {
         chatContext = this.typeComponent.getChatContext(chatContext);
      }

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
               game.settings.get('core', 'rollMode')
         )
      );
   }

   async addEffect() {

   }

   getRollData() {
      let rollData = super.getRollData();
      rollData.name = this.name;
      rollData.img = this.img;
      if (this.typeComponent) {
         return this.typeComponent.getRollData(rollData);
      }

      return rollData;
   }
}
