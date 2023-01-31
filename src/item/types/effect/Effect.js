import { addRulesElement, removeRulesElement } from '~/item/component/rules-element/RulesElementComponent';
import TitanTypeComponent from '~/helpers/TypeComponent';

export default class TitanEffect extends TitanTypeComponent {
   // Import functions for adding and removing rules elements
   addRulesElement = addRulesElement.bind(this);
   removeRulesElement = removeRulesElement.bind(this);

   onCreate() {
      if (this.isFirstOwner()) {
         const item = this.parent;
         const actor = item.parent;
         if (actor && item.system.effectId === '') {
            this._initializeEffect();
         }

         else if (item.img === 'icons/svg/item-bag.svg') {
            this.initializeImg();
         }

      }
   }

   async initializeImg() {
      return await this.parent.update({
         img: 'icons/svg/daze.svg'
      });
   }

   async _initializeEffect() {
      await this.initializeImg();

      const item = this.parent;
      const actor = item.parent;
      const effect = await ActiveEffect.create(
         {
            label: item.name,
            icon: item.img,
            origin: item.uuid,
            disabled: false,
            flags: {
               core: {
                  statusId: item.uuid,
               },
            },
         },
         {
            parent: actor
         }
      );

      return await item.update({
         system: {
            effectId: effect._id
         }
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

   onDelete() {
      // Remove any effects derived from this item
      const item = this.parent;
      if (item && item.effectId !== '') {
         const actor = this.parent.parent;
         if (actor) {
            actor.effects.filter((effect) => effect.origin === item.uuid).forEach((effect) => effect.delete);
         }
      }
   }
}
