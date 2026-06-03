import TitanDataModel from '~/document/data-model/TitanDataModel.js';

/**
 * Universal base data model for all TITAN chat message subtypes. Provides the Svelte component
 * contract consumed by TitanChatMessage#renderHTML; concrete subtypes override component.
 * @extends {TitanDataModel}
 */
export default class TitanChatMessageDataModel extends TitanDataModel {
   /**
    * The Svelte component class used to render this chat message's content. Concrete subtypes must
    * override this getter.
    * @type {object}
    */
   get component() {
      throw new Error(`${this.constructor.name} must override the 'component' getter.`);
   }
}
