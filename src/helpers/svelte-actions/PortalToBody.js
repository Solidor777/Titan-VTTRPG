/**
 * Svelte action that relocates its node to `document.body`, escaping ancestor `overflow` clipping
 * and `transform`-induced containing blocks. Foundry ApplicationV2 windows position themselves with
 * `transform`, which would otherwise trap and clip a floating dropdown; appending to the body lets
 * the list position against the viewport. The node is removed on destroy.
 * @param {HTMLElement} node - The element to relocate.
 * @returns {{ destroy: () => void }} The action handle.
 */
export default function portalToBody(node) {
   document.body.appendChild(node);

   return {
      /**
       * Removes the relocated node from the document.
       * @returns {void}
       */
      destroy() {
         node.remove();
      },
   };
}
