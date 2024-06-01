import {TJSDialog} from '@typhonjs-fvtt/runtime/svelte/application';
import getSetting from '~/helpers/utility-functions/GetSetting.js';
import {Z_INDEX_APP} from '~/system/Constants.js';
import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';

/**
 * Base dialog class with system specific functionality.
 * @param {object} options - Options for the dialog window.
 * @augments TJSDialog
 */
export default class TitanDialog extends TJSDialog {

   /**
    * Base dialog class with system specific functionality.
    * @param {object} options - Options for the dialog window.
    * @augments TJSDialog
    */
   constructor(options) {

      // Set base properties for the dialog
      options.id = options.id ?
         `${options.id}-${generateUUID()}` :
         `titan-dialog-${generateUUID()}`;
      super(options);

      // Add the sheet classes
      this.options.classes.push(...this._getDialogClasses());
   }

   /**
    * Default Application options.
    * @returns {object} Options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         width: 320,
         height: 'auto',
         zIndex: Z_INDEX_APP,
      });
   }

   /**
    * Gets a list of classes to add to this dialog for identification purposes.
    * @returns {string[]} List of classes to add to this dialog.
    * @protected
    */
   _getDialogClasses() {
      const retVal = ['titan', 'titan-dialog'];
      if (getSetting('darkModeSheets')) {
         retVal.push('titan-dark-mode');
      }

      return retVal;
   }
}
