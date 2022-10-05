import { addRulesElement, removeRulesElement } from '~/item/component/rules-element/RulesElementComponent';
import TitanTypeComponent from '~/helpers/TypeComponent';

export default class TitanEffect extends TitanTypeComponent {
   // Import functions for adding and removing rules elements
   addRulesElement = addRulesElement.bind(this);
   removeRulesElement = removeRulesElement.bind(this);

   onCreate() {
      if (this.parent.img === 'icons/svg/item-bag.svg') {
         this.initializeImg();
      }

      if (this.parent.parent) {
         this._initializeEffect();
      }
   }

   initializeImg() {
      this.parent.img = 'icons/svg/daze.svg';

      this.parent.update({
         img: this.parent.img
      });
   }

   async _initializeEffect() {
      const parent = this.parent;
      const actor = this.parent.parent;
      const effect = await ActiveEffect.create(
         {
            label: parent.name,
            icon: parent.img,
            origin: parent.uuid,
            disabled: false,
            flags: {
               core: {
                  statusId: parent.uuid,
               },
            },
         },
         {
            parent: actor
         }
      );

      this.parent.system.effectId = effect._id;
      this.parent.update({
         system: parent.system
      });
   }

   prepareDerivedData() {
      // Update effect icon and name
      if (this.parent.parent) {
         const effect = this.parent.parent.effects.get(this.parent.system.effectId);
         if (effect) {
            effect.icon = this.parent.img;
            effect.label = this.parent.name;
         }
      }
   }
}
