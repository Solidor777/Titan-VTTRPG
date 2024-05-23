/**
 * Class for adding a re-usable component to a data model.
 */
export default class DataModelComponent {
   // Reference to the parent data model.
   #parent;

   /**
    * Getter for the parent data model.
    * @param {TitanDataModel} parent - The parent data model this component is associated with.
    */
   constructor(parent) {
      this.#parent = parent;
   }

   /**
    * Getter for the parent data model.
    * @returns {TitanDataModel} - The parent data model this component is associated with.
    */
   get parent() {
      return this.#parent;
   }
}
