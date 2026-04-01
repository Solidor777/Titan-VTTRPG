import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import isHTMLBlank from '~/helpers/utility-functions/IsHTMLBlank.js';
import localize from '~/helpers/utility-functions/Localize.js';
import formatString from '~/helpers/utility-functions/FormatString.js';

/**
 * @type {number[]} The delay in milliseconds before showing and hiding a tooltip.
 * [0] = Delay before showing a tooltip.
 * [1] = Delay before hiding a tooltip.
 * */
const TOOLTIP_DELAY = [1000, 250];

/**
 * @type {number[]} The time in milliseconds it takes to show or hide a tooltip after the delay has expired.
 * [0] = Time to show a tooltip.
 * [1] = Time to hide a tooltip.
 * */
const TOOLTIP_DURATION = [400, 250];

/**
 * @typedef TooltipData Object containing the data for a tooltip.
 * @property {string} text - Text to display. May be formatted as HTML.
 * @property {boolean} [localize] - Whether to localize the tooltip text. Assumed to be true if not provided.
 * @property {object|[string|number]} [format] - Arguments for formatting the string if appropriate.
 * */

/**
 * @typedef {object} TooltipAction - Svelte action for adding a hovering tooltip to an element.
 * @property {Function} update - Updates the content in response to changes.
 * @property {Function} destroy - Destroys the action when no longer needed.
 * @property {tippy|boolean} tippyTooltip - The current tippy tooltip if the content is valid. Otherwise, false.
 * */

/**
 * Svelte action for adding a hovering tooltip to an element.
 * @param {Element} element - The node to add the tooltip to.
 * @param {string|TooltipData} content - The data for the tooltip.
 * @returns {TooltipAction} - The newly created tooltip.
 */
export default function tooltipAction(element, content) {
   // Calculate the initial content.
   let initialContent = calculateTooltipContent(content);

   // Initialize a tippy object if the content is valid.
   let tippyTooltip = initialContent
      ? initializeTippy(element, initialContent)
      : false;

   return {
      /**
       * Updates the content in response to changes.
       * @param {string|TooltipData} newContent - The updated content of the tooltip. May be formatted as HTML. Will
       *    be localized if provided as a string, or if the TooltipAction's localize boolean is not False.
       * */
      update: (newContent) => {

         // If the new content is valid...
         let updatedContent = calculateTooltipContent(newContent);
         if (updatedContent) {

            // If the tippy object already exists, update it with the new content.
            if (tippyTooltip) {

               // Update the tooltipAction object
               tippyTooltip.setProps({
                  content: updatedContent,
                  allowHTML: true,
                  duration: TOOLTIP_DURATION,
                  delay: TOOLTIP_DELAY
               });
            }

            // Otherwise, create a new tippy object.
            else {
               tippyTooltip = initializeTippy(element, updatedContent);
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
 * @returns {tippy} - The new tooltipAction object.
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

/**
 * Converts a tooltip content object into the string to be display.
 * @param {string|TooltipData} content - The data for the tooltip.
 * @returns {string|boolean} - The processed content string, or false if there is no content to display.
 */

function calculateTooltipContent(content) {
   // If the content is valid
   if (content) {
      // If the content is a string...
      if (typeof content === 'string' && content.length > 0) {

         // Localize the string.
         let retVal = localize(content);

         // Return the string if not blank.
         if (!isHTMLBlank(retVal)) {
            return retVal;
         }

      }

      // If the content is an object...
      else if (typeof content.text === 'string' && content.text.length > 0) {
         // Initialize the return value.
         let retVal = content.text;

         // Localize the string if not explicitly told otherwise.
         if (content.localize !== false) {
            retVal = localize(retVal);
         }

         // Format the string if formatting arguments were provided.
         if (content.format) {
            retVal = formatString(retVal, content.format);
         }

         // Return the string if not blank.
         if (!isHTMLBlank(retVal)) {
            return retVal;
         }
      }
   }

   // Return false if we could not retrieve a string.
   return false;
}
