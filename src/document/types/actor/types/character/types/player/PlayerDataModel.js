import CharacterDataModel from '~/document/types/actor/types/character/CharacterDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createPlayerSystemTemplate from '~/document/types/actor/types/character/types/player/PlayerSystemTemplate.js';
import assert from '~/helpers/utility-functions/Assert.js';

/**
 * Data model for player actors.
 * @extends {CharacterDataModel}
 */
export default class PlayerDataModel extends CharacterDataModel {
   /**
    * Toggles Inspiration on and off for this Player Character.
    * @returns {Promise<void>}
    */
   async toggleInspiration() {
      if (assert(
         this.parent.isOwner,
         'Cannot modify document %s if not owner.',
         this.parent.name,
      )) {
         this.inspiration = !this.inspiration;
         await this.parent.update({
            system: {
               inspiration: this.inspiration,
            },
         });
      }
   }

   /**
    * Defines the data schema for Player documents, built from the shared Player system shape template
    * (which spreads the Character shape template before the Player-specific fields), so the actor
    * schema and its shape-template-derived siblings stay a single source of truth.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...buildSchemaFromShape(createPlayerSystemTemplate()),
      };
   }

   prepareDerivedData() {
      super.prepareDerivedData();
      this.xp.available = this.xp.earned - this._getSpentXP();
   }

   getRollData() {
      const retVal = super.getRollData();
      retVal.xp = structuredClone(this.xp);
      retVal.inspiration = this.inspiration;

      return retVal;
   }

   _getInitialPrototypeTokenData(data) {
      const retVal = super._getInitialPrototypeTokenData(data);
      retVal.actorLink = data.prototypeToken?.actorLink ?? true;
      retVal.disposition = data.prototypeToken?.disposition ?? CONST.TOKEN_DISPOSITIONS.FRIENDLY;
      retVal.sight = {
         enabled: data.prototypeToken?.sight?.enabled ?? true,
      };

      return retVal;
   }

}
