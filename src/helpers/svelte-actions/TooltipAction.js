import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import isHTMLBlank from '~/helpers/utility-functions/IsHTMLBlank.js';

// The delay before showing and hiding a tooltipAction
const TOOLTIP_DELAY = [1000, 250];

// The time it takes to show or hide a tooltipAction,
const TOOLTIP_DURATION = [400, 250];

/**
 * Svelte action for adding a hovering tooltipAction to a node.
 * @param {Element} element - The node to add the tooltipAction to.
 * @param {string} content - The content of the tooltipAction. May be formatted as HTML.
 * @returns {object|null} - The new tooltipAction if the content was valid.
 */
export default function tooltipAction(element, content) {
   // Initialize a tooltipAction if the provided tooltipAction string is valid
   let tippyTooltip = !isHTMLBlank(content) ?
      initializeTippy(element, content) :
      false;

   // Return the update and destroy functions
   return {

      // Update function
      update: (newContent) => {

         // If the tooltipAction string is valid
         if (!isHTMLBlank(newContent)) {

            // If the tooltipAction object already exists
            if (tippyTooltip) {

               // Update the tooltipAction object
               tippyTooltip.setProps({
                  content: newContent,
                  allowHTML: true,
                  duration: TOOLTIP_DURATION,
                  delay: TOOLTIP_DELAY
               });
            }

            // Otherwise, create a new tooltipAction object
            else {
               tippyTooltip = initializeTippy(element, newContent);
            }
         }

         // Otherwise, destroy the tooltipAction object
         else if (tippyTooltip) {
            tippyTooltip.destroy();
            tippyTooltip = false;
         }
      },

      // Destroy the tooltipAction object when this object is destroyed.
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