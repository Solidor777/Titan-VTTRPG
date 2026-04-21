import { TJSDialog } from '@typhonjs-fvtt/runtime/svelte/application';
import { Z_INDEX_APP } from '~/system/Constants.js';
import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';
import darkModeSheets from '~/helpers/Settings/DarkModeSheets.js';
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js';

/**
 * Base dialog class with system-specific functionality.
 * @extends {TJSDialog}
 */
export default class TitanDialog extends TJSDialog {

   /**
    * @param {object} options - Options for the dialog window.
    */
   constructor(options) {
      // Add default classes.
      const classes = [
         'titan',
         'titan-dialog',
      ];

      // Add the dark mode class if appropriate.
      if (darkModeSheets()) {
         classes.push('titan-dark-mode');
      }

      // Merge the classes with those provided by the options object.
      options.classes = options.classes
         ? mergeArrays(classes, options.classes)
         : classes;

      // Set base properties for the dialog.
      options.id = options.id ?
         `${options.id}-${generateUUID()}` :
         `titan-dialog-${generateUUID()}`;
      super(options);
   }

   /**
    * Default Application options.
    * @returns {object} Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         width: 320,
         height: 'auto',
         zIndex: Z_INDEX_APP,
      });
   }
}
