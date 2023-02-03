import { addRulesElement, removeRulesElement } from '~/item/component/rules-element/RulesElementComponent';
import { localize } from '~/helpers/Utility';
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
      this.parent.img = 'icons/svg/daze.svg';

      return await this.parent.update({
         img: 'icons/svg/daze.svg'
      });
   }

   async _initializeEffect() {
      const item = this.parent;
      item.system.effectId = "creatingEffect";
      await this.initializeImg();

      const actor = item.parent;
      const effects = await actor.createEmbeddedDocuments('ActiveEffect',
         [{
            label: item.name,
            icon: item.img,
            origin: item.uuid,
            disabled: false,
            duration: {
               turns: item.system.duration.turns
            },
            flags: {
               core: {
                  statusId: item.uuid,
               },
               'visual-active-effects.data.content': TextEditor.enrichHTML(item.system.description, { async: false, secrets: true })
            },
         }],
      );

      const effect = effects[0];

      if (item.system.duration !== 'permanent') {
         await effect.update({
            duration: {
               turns: item.system.duration.remaining
            }
         })
      }

      return await item.update({
         system: {
            effectId: effect._id
         }
      });
   }

   prepareDerivedData() {
      this._updateEffects();

      return;
   }

   _updateEffects() {
      if (this.isFirstOwner()) {
         const effects = this._getEffects();
         if (effects.length > 0) {
            const item = this.parent;
            effects.forEach((effect) => {
               const updateData = {};
               let shouldUpdateEffect = false;

               // Update the icon
               const icon = item.img;
               if (effect.icon !== icon) {
                  shouldUpdateEffect = true;
                  updateData.icon = icon;
               }

               // Update the duration remaining if appropriate
               const isPermanent = item.system.duration.type === 'permanent';
               const remaining = isPermanent ? 0 : item.system.duration.remaining;
               if (effect.duration.turns !== remaining) {
                  shouldUpdateEffect = true;
                  updateData.duration = {
                     turns: remaining
                  };
               }

               // Update the label
               const label = isPermanent || remaining > 0 ? item.name : `${item.name} (${localize('expired')})`;
               if (effect.label !== label) {
                  shouldUpdateEffect = true;
                  updateData.label = label;
               }

               // Update visual active effects description if appropriate
               const description = item.system.description === ''
                  || item.system.description === '<p></p>' ? '' : TextEditor.enrichHTML(item.system.description, { async: false, secrets: true });
               if (description !== effect['flags.visual-active-effects.data.content']) {
                  shouldUpdateEffect = true;
                  updateData['flags.visual-active-effects.data.content'] = description;
               }

               // Update effect if appropriate
               if (shouldUpdateEffect) {
                  effect.update(updateData);
               }
            });
         }
      }

      return;
   }

   onDelete() {
      this._getEffects().forEach((effect) => effect.delete);

      return;
   }

   _getEffects() {
      const item = this.parent;
      if (item && item.effectId !== '') {
         const actor = this.parent.parent;
         if (actor) {
            return actor.effects.filter((effect) => effect.origin === item.uuid);
         }
      };

      return [];
   }

   isExpired() {
      return this.parent.system.duration.type !== 'permanent' && this.parent.system.duration.remaining <= 0;
   }

   isPermanent() {
      return this.parent.system.duration.type === 'permanent';
   }
}
