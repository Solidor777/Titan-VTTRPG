import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import isHTMLBlank from '~/helpers/utility-functions/IsHTMLBlank.js';
import processTextData from '~/helpers/ProcessTextData.js';

/**
 * @type {number[]} The delay in milliseconds before showing and hiding a tooltip.
 * [0] = Delay before showing a tooltip.
 * [1] = Delay before hiding a tooltip.
 */
const TOOLTIP_DELAY = [
   1000,
   250,
];

/**
 * @type {number[]} The time in milliseconds it takes to show or hide a tooltip after the delay has expired.
 * [0] = Time to show a tooltip.
 * [1] = Time to hide a tooltip.
 */
const TOOLTIP_DURATION = [
   400,
   250,
];

/**
 * @typedef {object} TooltipAction - Svelte action for adding a hovering tooltip to an element.
 * @property {Function} update - Updates the content in response to changes.
 * @property {Function} destroy - Destroys the action when no longer needed.
 * @property {tippy|boolean} tippyTooltip - The current tippy tooltip if the content is valid. Otherwise, false.
 */

/**
 * Svelte action for adding a hovering tooltip to an element.
 * @param {Element} element - The node to add the tooltip to.
 * @param {string|TextData} textData - The data for the tooltip.
 * @returns {TooltipAction} The newly created tooltip.
 */
export default function tooltipAction(element, textData) {
   // Calculate the initial content.
   let initialContent = processTextData(textData);

   // Initialize a tippy object if the content is valid.
   let tippyTooltip = isHTMLBlank(initialContent)
      ? false
      : initializeTippy(element, initialContent);

   return {
      /**
       * Updates the content in response to changes.
       * @param {string|TextData} newTextData - The updated tooltip content, formatted as HTML or plain text.
       */
      update: (newTextData) => {

         // If the new content is valid.
         let updatedTextData = processTextData(newTextData);
         if (!isHTMLBlank(updatedTextData)) {

            // If the tippy object already exists, update it with the new content.
            if (tippyTooltip) {

               // Update the tooltip with the new content.
               tippyTooltip.setProps({
                  content: updatedTextData,
                  allowHTML: true,
                  duration: TOOLTIP_DURATION,
                  delay: TOOLTIP_DELAY
               });
            }

            // Otherwise, create a new tippy object.
            else {
               tippyTooltip = initializeTippy(element, updatedTextData);
            }
         }

         // Otherwise, destroy the tippy object if it exists.
         else if (tippyTooltip) {
            tippyTooltip.destroy();
            tippyTooltip = false;
         }
      },

      /**
       * Destroys the action when no longer needed.
       */
      destroy: () => {
         if (tippyTooltip) {
            tippyTooltip.destroy();
         }
      }
   };
}

/**
 * Initializes a tippy tooltipAction object.
 * @param {Element} element - The node to add the tooltipAction to.
 * @param {string} content - The content of the tooltipAction. May be formatted as HTML.
 * @returns {tippy} The new tooltipAction object.
 */
function initializeTippy(element, content) {
   return tippy(
      element,
      {
         content: content,
         allowHTML: true,
         duration: TOOLTIP_DURATION,
         delay: TOOLTIP_DELAY
      }
   );
}
