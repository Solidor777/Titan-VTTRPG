import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import isHTMLBlank from '~/helpers/utility-functions/IsHTMLBlank.js';

// The delay before showing and hiding a tooltip
const TOOLTIP_DELAY = [1000, 250];

// The time it takes to show or hide a tooltip,
const TOOLTIP_DURATION = [400, 250];

/**
 * Svelte action for adding a hovering tooltip to a node.
 * @param {Node} node - The node to add the tooltip to.
 * @param {string} content - The content of the tooltip. May be formatted as HTML.
 * @returns {object|null} - The new tooltip if the content was valid.
 */
export default function tooltip(node, content) {
   // Initialize a tooltip if the provided tooltip string is valid
   let tippyTooltip = !isHTMLBlank(content) ?
      initializeTippy(node, content) :
      false;

   // Return the update and destroy functions
   return {

      // Update function
      update: (newContent) => {

         // If the tooltip string is valid
         if (!isHTMLBlank(newContent)) {

            // If the tooltip object already exists
            if (tippyTooltip) {

               // Update the tooltip object
               tippyTooltip.setProps({
                  content: newContent,
                  allowHTML: true,
                  duration: TOOLTIP_DURATION,
                  delay: TOOLTIP_DELAY
               });
            }

            // Otherwise, create a new tooltip object
            else {
               tippyTooltip = initializeTippy(node, newContent);
            }
         }

         // Otherwise, destroy the tooltip object
         else if (tippyTooltip) {
            tippyTooltip.destroy();
            tippyTooltip = false;
         }
      },

      // Destroy the tooltip object when this object is destroyed.
      destroy: () => {
         if (tippyTooltip) {
            tippyTooltip.destroy();
         }
      }
   };
}

/**
 * Initializes a tippy tooltip object.
 * @param {Node} node - The node to add the tooltip to.
 * @param {string} content - The content of the tooltip. May be formatted as HTML.
 * @returns {tippy} - The new tooltip object.
 */
function initializeTippy(node, content) {
   return tippy(
      node,
      {
         content: content,
         allowHTML: true,
         duration: TOOLTIP_DURATION,
         delay: TOOLTIP_DELAY
      }
   );
}