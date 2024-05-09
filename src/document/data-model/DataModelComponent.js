/**
 * Class for adding a re-usable component to a data model
 */
export default class DataModelComponent {
   /**
    * Getter for the parent data model.
    * @param {TitanDataModel} parent   The parent data model.
    */
   constructor(parent) {
      this.#parent = parent;
   }

   // Reference to the parent data model.
   #parent;

   /**
    * Getter for the parent data model.
    * @returns {TitanDataModel}  The parent data model.
    */
   get parent() {
      return this.#parent;
   }
}
