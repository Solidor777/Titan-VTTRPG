import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';

export default function tooltip(node, params) {
   let tippy = params?.content ? initializeTippy(node, params) : false;

   return {
      update: (newParams) => {
         if (newParams?.content) {

            if (tippy) {
               const content = newParams.content;
               const allowHTML = true;
               const delay = [1000, 250];
               const duration = [400, 250];
               tippy.setProps({ content, allowHTML, duration, delay });
            }

            else {
               tippy = initializeTippy(node, params);
            }
         }

         else if (this.tippy) {
            tippy.destroy();
            tippy = false;
         }
      },

      destroy: {
         if(tippy) {
            tippy.destroy();
         }
      }
   };
}

function initializeTippy(node, params) {
   const content = params.content;
   const allowHTML = true;
   const delay = [1000, 250];
   const duration = [400, 250];
   return tippy(node, { content, allowHTML, duration, delay });
}