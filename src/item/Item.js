import { localize } from '~/helpers/Utility.js';
import { v4 as uuidv4 } from 'uuid';
import TitanAbility from './types/ability/Ability.js';
import TitanArmor from './types/armor/Armor.js';
import TitanEffect from './types/effect/Effect.js';
import TitanEquipment from './types/equipment/Equipment.js';
import TitanShield from './types/shield/Shield.js';
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

         case 'armor': {
            this.typeComponent = new TitanArmor(this);
            this.armor = this.typeComponent;
            break;
         }

         // Effect
         case 'effect': {
            this.typeComponent = new TitanEffect(this);
            this.effect = this.typeComponent;
            break;
         }

         // Effect
         case 'equipment': {
            this.typeComponent = new TitanEquipment(this);
            this.equipment = this.typeComponent;
            break;
         }

         // Shield
         case 'shield': {
            this.typeComponent = new TitanShield(this);
            this.shield = this.typeComponent;
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

      const speaker = options?.speaker ?? null;
      const token = (speaker ? (speaker.token ? speaker.token : speaker.getActiveTokens(false, true)[0]) : null);

      // Create and post the message
      return await ChatMessage.create(
         ChatMessage.applyRollMode(
            {
               user: options?.user ? options.user : game.user.id,
               speaker: speaker,
               token: token,
               type: CONST.CHAT_MESSAGE_TYPES.OTHER,
               sound: CONFIG.sounds.notification,
               flags: {
                  titan: {
                     chatContext: chatContext
                  }
               },
               classes: ['titan']
            },
            options?.rollMode ?
               options.rollMode :
               game.settings.get('core', 'rollMode')
         )
      );
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

   addCheck() {
      this.system.check.push(this.getCheckTemplate());
      return this.update({
         system: this.system
      });
   }

   removeCheck(idx) {
      this.system.check.splice(idx, 1);
      return this.update({
         system: this.system
      });
   }

   getCheckTemplate() {
      return {
         label: localize('check'),
         attribute: 'body',
         skill: 'arcana',
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
}
