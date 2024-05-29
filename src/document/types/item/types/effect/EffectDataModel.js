import RulesElementItemDataModel from '~/document/types/item/RulesElementItemDataModel.js';
import createSchemaField from '~/helpers/utility-functions/CreateSchemaField.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';
import createIntegerField from '~/helpers/utility-functions/CreateIntegerField.js';
import createBooleanField from '~/helpers/utility-functions/CreateBooleanField.js';
import {EFFECT_IMAGE} from '~/system/DefaultImages.js';
import isCurrentUserBestOwner from '~/helpers/utility-functions/IsCurrentUserBestOwner.js';
import ActionQueue from '~/helpers/ActionQueue.js';
import localize from '~/helpers/utility-functions/Localize.js';
import isHTMLBlank from '~/helpers/utility-functions/IsHTMLBlank.js';

/**
 * Data model with extra functionality for Effects.
 * @augments TitanDataModel
 */
export default class EffectDataModel extends RulesElementItemDataModel {
   /**
    * Returns whether this Effect's duration has expired.
    * Permanent Effects never expire.
    * Non-permanent Effects expire when their Turns Remaining is 0.
    * @returns {boolean} This Effect's duration has expired.
    */
   get isExpired() {
      return this.duration.type !== 'permanent' && this.duration.remaining <= 0;
   }

   /**
    * Returns whether this Effect item is currently Active.
    * Permanent Effects can be toggled Active and Inactive.
    * Non-permanent Effects are always Active.
    * @returns {boolean} Whether this Effect item is currently Active.
    */
   get isActive() {
      return this.active || this.duration.type !== 'permanent';
   }

   /**
    * Returns whether Effect item is a Combat Effect.
    * Permanent Effects and effects with a custom Duration are considered non-Combat Effects.
    * Effects with a duration measured in turns are considered Combat Effects.
    * @returns {boolean} Whether this Effect item is a Combat Effect.
    */
   get isCombatEffect() {
      return this.duration.type !== 'permanent' && this.duration.type !== 'custom';
   }

   /**
    * Gets the parent documents's Action Queue object.
    * @returns {ActionQueue} The parent actor's Action Queue.
    */
   get actionQueue() {
      return this.parent.actionQueue;
   }

   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();

      // Duration
      schema.duration = createSchemaField({
         type: createStringField('turnStart'),
         remaining: createIntegerField(1),
         initiative: createIntegerField(1),
         custom: createStringField(),
      });

      // Active
      schema.active = createBooleanField(true);

      return schema;
   }

   getRollData() {
      const retVal = super.getRollData();
      retVal.duration = foundry.utils.deepClone(this.duration);
      retVal.active = this.active;

      return retVal;
   }

   _getDefaultImage() {
      return EFFECT_IMAGE;
   }

   _getDefaultName() {
      return localize('newEffect');
   }

   _getInitialDocumentData(data) {
      let retVal = super._getInitialDocumentData(data);

      // Check if we have a valid actor owner
      if (this.parent && !this.parent.pack && this.parent._id && typeof data?.system?.initiative !== 'number') {
         const actor = this.parent.parent;
         if (actor) {

            // Check if the actor is in an active combat
            const initiative = actor.getFirstActiveCombat()?.initiative;
            if (initiative !== null) {

               // If so, set our initiative accordingly
               retVal ??= {};
               retVal.system ??= {};
               retVal.system.duration ??= {};
               retVal.system.duration.initiative = initiative;
            }
         }
      }

      return retVal;
   }

   prepareDerivedData() {
      // If we are the best first owner of this document, and this document is not in a compendium
      if (isCurrentUserBestOwner(this.parent) &&
         !this.parent.pack && this.parent._id &&
         !this.parent.isMarkedForDeletion) {

         // Ensure the action queue is initialized
         if (!this.parent.actionQueue) {
            this.parent.actionQueue = new ActionQueue();
         }

         // Queue the latent data preparation
         this.actionQueue.enqueue({
            callback: this._updateActiveEffects,
            thisArg: this,
            key: 'prepareLatentData',
         });
      }
   }

   /**
    * Handles preparing data that could take more than one frame,
    * or that could trigger other updates on the document.
    * @returns {Promise<void>}
    * @private
    */
   async _updateActiveEffects() {
      if (!this.parent.isMarkedForDeletion) {
         const effects = this.parent.effects.filter((effect) => effect.flags?.titan);
         const shouldBeActive = this.isActive;

         // Add the first effect if necessary
         if (effects.length < 1) {
            await this.parent.createEmbeddedDocuments('ActiveEffect',
               [
                  {
                     label: this.parent.name,
                     img: this.parent.img,
                     disabled: !shouldBeActive,
                     transfer: shouldBeActive,
                     duration: {
                        turns: this.duration.turns,
                     },
                     statuses: [
                        `${this.parent._id}`,
                     ],
                     origin: this.parent.uuid,
                     flags: {
                        titan: {
                           type: 'effect',
                           origin: this.parent._id,
                        },
                        'visual-active-effects.data.content': TextEditor.enrichHTML(
                           this.description, {
                              async: false,
                              secrets: true,
                           },
                        ),
                     },
                  },
               ],
            );
         }

         // Otherwise, update effects
         else {
            // Ensure the first effect owned by the item matches the item data
            const effect = effects[0];

            // Update the effect if appropriate
            const updateData = {};
            let shouldUpdateEffect = false;

            // Update the icon
            const img = this.parent.img;
            if (effect.img !== img) {
               shouldUpdateEffect = true;
               updateData.img = img;
            }

            // Update the turns remaining
            const isPermanent = this.duration.type === 'permanent';
            const turnsRemaining = isPermanent ? 0 : this.duration.remaining;
            if (effect.duration.turns !== turnsRemaining) {
               shouldUpdateEffect = true;
               updateData.duration = {
                  turns: turnsRemaining,
               };
            }

            // Update active
            if (effect.transfer !== shouldBeActive) {
               shouldUpdateEffect = true;
               updateData.transfer = shouldBeActive;
               updateData.disabled = !shouldBeActive;
            }

            // Update the label
            const label = this.isExpired ?
               `${this.parent.name} (${localize('expired')})` :
               this.parent.name;
            if (effect.name !== label) {
               shouldUpdateEffect = true;
               updateData.label = label;
            }

            // Update visual active effects description if appropriate
            const description = isHTMLBlank(this.description) ?
               '' :
               TextEditor.enrichHTML(this.description, {
                  async: false,
                  secrets: true,
               });
            if (description !== effect['flags.visual-active-effects.data.content']) {
               shouldUpdateEffect = true;
               updateData['flags.visual-active-effects.data.content'] = description;
            }

            // Update effect if appropriate
            if (shouldUpdateEffect) {
               await effect.update(updateData);
            }

            // Delete any additional effect items
            for (let idx = 1; idx < effect.length; idx++) {
               await effect.delete;
            }
         }
      }
   }
}
