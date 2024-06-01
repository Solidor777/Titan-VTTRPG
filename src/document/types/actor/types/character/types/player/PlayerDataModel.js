import CharacterDataModel from '~/document/types/actor/types/character/CharacterDataModel.js';
import createSchemaField from '~/helpers/utility-functions/CreateSchemaField.js';
import createNumberField from '~/helpers/utility-functions/CreateNumberField.js';
import createBooleanField from '~/helpers/utility-functions/CreateBooleanField.js';

/**
 * Data model for player actors.
 * @augments CharacterDataModel
 */
export default class PlayerDataModel extends CharacterDataModel {
   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();
      schema.xp = createSchemaField({
         earned: createNumberField(),
      });
      schema.inspiration = createBooleanField(false);

      return schema;
   }

   getRollData() {
      const retVal = super.getRollData();
      retVal.xp = foundry.utils.deepClone(this.xp);
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

   prepareDerivedData() {
      super.prepareDerivedData();
      this.xp.available = this.xp.earned - this._getSpentXP();
   }
   
   /**
    * Toggles Inspiration on and off for this Player Character.
    * @returns {Promise<void>}
    */
   async toggleInspiration() {
      if (this.parent.isOwner) {
         this.inspiration = !this.inspiration;
         await this.parent.update({
            system: {
               inspiration: this.inspiration,
            },
         });
      }
   }
}
