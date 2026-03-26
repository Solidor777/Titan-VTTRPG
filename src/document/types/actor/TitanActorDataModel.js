import TitanDataModel from '~/document/data-model/DataModel.js';

/**
 * Data model with extra functionality for Actors.
 * @extends TitanDataModel
 * @property {TitanActor} parent - The Actor that owns this data model.
 */
export default class TitanActorDataModel extends TitanDataModel {
   onPreCreate(data) {
      super.onPreCreate(data);

      // Initialize prototype token data
      const prototypeTokenData = this._getInitialPrototypeTokenData(data);
      if (prototypeTokenData) {
         this.parent.prototypeToken.updateSource(prototypeTokenData);
      }
   }

   /**
    * Called after an Item is added to this Data Model's Actor.
    * @param {TitanItem} item - The Item that was just created.
    */
   postAddItem(item) {
   }

   /**
    * Called before an Item is removed from this Data Model's Actor.
    * @param {TitanItem} item - The Item being deleted.
    */
   preDeleteItem(item) {
   }

   /**
    * Called after an Item is removed from this Data Model's Actor.
    * @param {string} id - The ID of the item that was deleted.
    * @param {string} type - The Type of the item that was deleted.
    */
   postDeleteItem(id, type) {
   }

   /**
    * Gets the initial data for the actor's prototype token.
    * @param {object} data - The initial data object provided to the document creation request.
    * @returns {object|boolean} The initial data for the prototype token,
    * or false if there is no data to initialize.
    * @protected
    */
   _getInitialPrototypeTokenData(data) {
      return false;
   }
}
