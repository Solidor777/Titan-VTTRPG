import { addRulesElement, removeRulesElement } from '~/item/component/rules-element/RulesElementComponent';
import { localize, isFirstOwner } from '~/helpers/Utility';
import TitanTypeComponent from '~/helpers/TypeComponent';

export default class TitanEffect extends TitanTypeComponent {
   // Import functions for adding and removing rules elements
   addRulesElement = addRulesElement.bind(this);
   removeRulesElement = removeRulesElement.bind(this);

   onCreate() {
      if (isFirstOwner(this.parent)) {
         this._initializeEffect();
      }
   }

   getInitialData() {
      // Image
      if (this.parent.img === 'icons/svg/item-bag.svg') {
         return {
            img: 'icons/svg/daze.svg'
         };
      }

      return false;
   }


   async _initializeEffect() {
      // Check if an effect has already been created
      if (!this._getEffects()) {

         // If not, create an effect
         const item = this.parent;
         const actor = item.parent;
         item.system.effectId = "creatingEffect";
         const effects = await actor.createEmbeddedDocuments('ActiveEffect',
            [{
               label: item.name,
               icon: item.img,
               origin: item._id,
               disabled: false,
               duration: {
                  turns: item.system.duration.turns
               },
               flags: {
                  core: {
                     statusId: item._id,
                  },
                  titan: {
                     itemId: item._id,
                  },
                  'visual-active-effects.data.content': TextEditor.enrichHTML(item.system.description, { async: false, secrets: true })
               },
            }],
         );
         const effect = effects[0];

         // Set the turns remaining on the effect
         if (item.system.duration !== 'permanent') {
            await effect.update({
               duration: {
                  turns: item.system.duration.remaining
               }
            });
         }

         // Update the item
         return await item.update({
            system: {
               effectId: effect._id
            }
         });
      }

      return;
   }

   prepareDerivedData() {
      // If this is the first owner
      if (isFirstOwner(this.parent)) {

         // Get the effects associated with this item 
         const effects = this._getEffects();
         if (effects?.length > 0) {
            const item = this.parent;

            // For each associated effect
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
               const description = item.system.description === '' ||
                  item.system.description === '<p></p>' ? '' : TextEditor.enrichHTML(item.system.description, { async: false, secrets: true });
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
      if (isFirstOwner(this.parent)) {
         this._getEffects().forEach((effect) => effect.delete());
      }

      return;
   }

   _getEffects() {
      const item = this.parent;
      // If an effect id has been set
      if (item.effectId !== '') {

         // If we have an actor
         const actor = this.parent.parent;
         if (actor) {

            // If we have at least one effect
            const effects = actor.effects.filter((effect) => effect.origin === item._id);
            if (effects.length > 0) {
               return effects;
            }
         }
      }

      return false;
   }

   isExpired() {
      return this.parent.system.duration.type !== 'permanent' && this.parent.system.duration.remaining <= 0;
   }

   isPermanent() {
      return this.parent.system.duration.type === 'permanent';
   }
}
