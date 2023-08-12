import { localize } from '~/helpers/Utility.js';
import { Hashing } from '@typhonjs-fvtt/runtime/util';
import TitanAbility from '~/item/types/ability/Ability.js';
import TitanArmor from '~/item/types/armor/Armor.js';
import TitanEffect from '~/item/types/effect/Effect.js';
import TitanEquipment from '~/item/types/equipment/Equipment.js';
import TitanShield from '~/item/types/shield/Shield.js';
import TitanSpell from '~/item/types/spell/Spell.js';
import TitanWeapon from '~/item/types/weapon/Weapon.js';
import DocumentAddCustomTraitDialog from '~/documents/DocumentAddCustomTraitDialog';
import DocumentEditCustomTraitDialog from '~/documents/DocumentEditCustomTraitDialog';

export default class TitanItem extends Item {
   async _preCreate(data, options, user) {
      await super._preCreate(data, options, user);

      // Initialize type component
      this._initializeTypeComponent();

      // Initialize creation data
      const uuid = this.flags?.titan?.uuid;
      if (!uuid) {

         // UUID
         const initialData = {
            flags: {
               titan: {
                  uuid: Hashing.uuidv4()
               }
            }
         };

         // Type specific data
         if (this.typeComponent) {
            this.typeComponent.setInitialData(initialData);
         }

         this.updateSource(initialData);
      }
   }

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

         // Armor
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

         // Equipment
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
      if (!this.typeComponent) {
         this._initializeTypeComponent();
      }

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
      const chatContext = {
         type: this.type,
         img: this.img,
         name: this.name,
         flags: this.flags,
         system: this.system,
      };

      if (this.typeComponent) {
         this.typeComponent.getChatContext(chatContext);
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
                  titan: chatContext
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
      const rollData = super.getRollData();
      rollData.name = this.name;
      rollData.img = this.img;
      if (this.typeComponent) {
         return this.typeComponent.getRollData(rollData);
      }

      return rollData;
   }

   async addCheck() {
      if (this.isOwner) {
         this.system.check.push(this.getCheckTemplate());
         await this.update({
            system: this.system
         });

         // Update Sheet
         const sheet = this._sheet;
         if (this._sheet) {
            sheet.addCheck();
         }
      }

      return;
   }

   async removeCheck(idx) {
      // Update sheet
      const sheet = this._sheet;
      if (this._sheet) {
         sheet.removeCheck(idx);
      }

      if (this.isOwner) {
         this.system.check.splice(idx, 1);
         await this.update({
            system: this.system
         });
      }
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
         uuid: Hashing.uuidv4()
      };
   }

   // Opens the new custom trait dialog
   addCustomTrait() {
      if (this.isOwner) {
         const dialog = new DocumentAddCustomTraitDialog(this);
         dialog.render(true);
      }
      return;
   }

   // Opens the edit custom trait dialog
   editCustomTrait(traitIdx) {
      if (this.isOwner) {
         const dialog = new DocumentEditCustomTraitDialog(this, traitIdx);
         dialog.render(true);
      }

      return;
   }

   // Removes a custom trait from an attack
   async deleteCustomTrait(traitIdx) {
      if (this.isOwner) {
         this.system.customTrait.splice(traitIdx, 1);
         await this.update({
            system: {
               customTrait: this.system.customTrait
            }
         });
      }

      return;
   }
}
