import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';

const content = newParams.content;
const allowHTML = true;
const delay = [1000, 250];
const duration = [400, 250];

export default function tooltip(node, params) {
   let tippy = params?.content ? initializeTippy(node, params) : false;

   return {
      update: (newParams) => {
         if (newParams?.content) {

            if (tippy) {
               tippy.setProps({ content, allowHTML, duration, delay });
            }

            else {
               tippy = initializeTippy(node, params);
            }
         }

         else if (tippy) {
            tippy.destroy();
            tippy = false;
         }
      },

      destroy: () => {
         if (tippy) {
            tippy.destroy();
         }
      }
   };
}

function initializeTippy(node, params) {
   return tippy(node, { content, allowHTML, duration, delay });
}