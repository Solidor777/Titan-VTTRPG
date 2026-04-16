import CharacterDataModel from '~/document/types/actor/types/character/CharacterDataModel.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';
import getSetting from '~/helpers/utility-functions/GetSetting.js';
import assert from '~/helpers/utility-functions/Assert.js';

/**
 * Data model for NPC actors.
 * @extends {CharacterDataModel}
 */
export default class NPCDataModel extends CharacterDataModel {
   /**
    * Applies Damage to the Character.
    * Override for handling Minions dying in 1 hit and overkill damage.
    * @param {number} damage - Amount of Damage to apply.
    * @param {DamageOptions} [options] - Options for applying the Damage.
    * @returns {Promise<DamageReport|void>} Results of applying the Damage.
    */
   async applyDamage(damage, options) {
      if (!assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {
         return;
      }

      // If we are a minion and not already dead.
      if (this.role === 'minion' && this.resource.stamina.value > 0) {

         // Call the parent version of the function without updating the actor.
         // or starting a report.
         const superOptions = options ? structuredClone(options) : {};
         superOptions.updateActor = false;
         superOptions.report = false;
         const reportData = await super.applyDamage(damage, superOptions);

         // If we took any damage.
         if (reportData.damageTaken) {

            // Set stamina to 0.
            this.resource.stamina.value = 0;

            // Calculate overkill damage.
            const overkillDamage = reportData.damageTaken - this.resource.stamina.max;
            if (overkillDamage > 0) {
               reportData.overkillDamage = overkillDamage;
            }

            // Update the actor document unless explicitly instructed otherwise.
            if (options?.updateActor !== false) {

               await this.parent.update({
                  system: {
                     resource: {
                        stamina: {
                           value: this.stamina.value,
                        },
                        wounds: {
                           value: this.wounds.value,
                        },
                     },
                  },
               });
            }
         }

         // Report taking and resisting damage if appropriate.
         if (options?.report !== false && getSetting('reportTakingDamage')) {

            // Send the report to chat.
            await this._whisperOwners(reportData, game.user.id, options?.playSound !== false);
         }

         return reportData;
      }

      // Otherwise, apply damage as normal.
      else {
         return super.applyDamage(damage, options);
      }
   }

   /**
    * @override
    * @returns {object} The schema for this data model.
    * @protected
    */
   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();
      schema.bio.type = createStringField();
      schema.role = createStringField('warrior');

      return schema;
   }

   /**
    * @override
    * @returns {object} Roll data for this Character, including the NPC role.
    */
   getRollData() {
      const retVal = super.getRollData();
      retVal.role = this.role;

      return retVal;
   }

   /**
    * @override
    */
   prepareDerivedData() {
      super.prepareDerivedData();
      this.parent.system.xp = this._getSpentXP();
   }

   /**
    * Makes adjustments to the base Resources of Non-Player Characters.
    * @protected
    */
   _calculateBaseResources() {
      super._calculateBaseResources();

      // Resource amounts vary by NPC types.
      switch (this.role) {
         // Minions and below have a special stamina multiplier.
         case 'minion': {
            this.resource.stamina.maxBase =
               Math.max(this.resource.stamina.maxBase * getSetting('minionStaminaMultiplier'), 1);
            this.resource.resolve.maxBase = 0;
            this.resource.wounds.maxBase = 0;
            return;
         }

         // Warriors and below have no resolve.
         case 'warrior': {
            this.resource.resolve.maxBase = 0;
            this.resource.wounds.maxBase = 0;
            return;
         }

         // Elites and below have no wounds.
         case 'elite': {
            this.resource.wounds.maxBase = 0;
            return;
         }

         // Champions have the same stats as players.
         default: {
            return;
         }
      }
   }

}
