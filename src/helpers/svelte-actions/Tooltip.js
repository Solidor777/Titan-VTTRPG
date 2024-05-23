import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';

const allowHTML = true;
const delay = [1000, 250];
const duration = [400, 250];

/**
 * @param node
 * @param params
 */
export default function tooltip(node, params) {
   let tippyTooltip = params?.content ? initializeTippy(node, params) : false;

   return {
      update: (newParams) => {
         if (newParams?.content) {

            if (tippyTooltip) {
               const content = newParams.content;
               tippyTooltip.setProps({ content, allowHTML, duration, delay });
            }

            else {
               tippyTooltip = initializeTippy(node, params);
            }
         }

         else if (tippyTooltip) {
            tippyTooltip.destroy();
            tippyTooltip = false;
         }
      },

      destroy: () => {
         if (tippyTooltip) {
            tippyTooltip.destroy();
         }
      }
   };
}

/**
 * @param node
 * @param params
 */
function initializeTippy(node, params) {
   const content = params.content;
   return tippy(node, { content, allowHTML, duration, delay });
}