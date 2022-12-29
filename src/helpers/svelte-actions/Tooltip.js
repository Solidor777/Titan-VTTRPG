import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';

export default function tooltip(node, params = {}) {
    if (params?.content) {
      const content = params.content;
      const allowHTML = true;
      const delay = [1000,250];
      const duration = [400,250];
  
      // Support any of the Tippy props by forwarding all "params":
      // https://atomiks.github.io/tippyjs/v6/all-props/
      const tooltip = tippy(node, { content, allowHTML, duration, delay, ...params });
    
      return {
        // If the props change, let's update the Tippy instance:
        update: (newParams) => {
          console.log(content);
          tooltip.setProps({ content, allowHTML, duration, delay, ...newParams })
        },
    
        // Clean up the Tippy instance on unmount:
        destroy: () => tooltip.destroy(),
      };
  
    }

    return;

}