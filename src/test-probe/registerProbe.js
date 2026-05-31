import { mount, unmount, createRawSnippet } from 'svelte';
import componentRegistry from '~/test-probe/componentRegistry.js';

/**
 * Install the test-only component probe API on `game.titan._probe`. Mounts a registered primitive
 * into a detached container appended to `document.body`, tracks the handle, and exposes teardown.
 * This module is only imported when the bundle is built with `--mode e2e` (gated by `__TITAN_PROBE__`).
 * @returns {void}
 */
export default function registerProbe() {
   // Active probe handles keyed by generated id.
   const handles = new Map();

   // Monotonic id source for probe containers.
   let nextId = 0;

   game.titan._probe = {
      // The names available to mount.
      components: Object.keys(componentRegistry),

      /**
       * Mount a registered component in isolation.
       * @param {string} name - The registered component name.
       * @param {object} [props] - Props to pass; a string `text` prop becomes a default-slot snippet.
       * @param {Map<string, *>} [context] - Optional Svelte context map for components using getContext.
       * @returns {{ id: string, selector: string }} The probe id and its container selector.
       * @throws {Error} When `name` is not present in the component registry.
       */
      mount(name, props = {}, context = new Map()) {
         const Component = componentRegistry[name];
         if (!Component) {
            throw new Error(`Unknown probe component: ${name}`);
         }

         // Convert a `text` shorthand into a renderable children snippet when no children supplied.
         const finalProps = { ...props };
         if (typeof finalProps.text === 'string' && finalProps.children === undefined) {
            const text = finalProps.text;
            finalProps.children = createRawSnippet(() => {
               return {
                  render: () => `<span>${text}</span>`,
               };
            });
            delete finalProps.text;
         }

         // Create a dedicated container so each probe is independently locatable and removable. It is
         // fixed at the top-left with a very high z-index so the mounted primitive sits above Foundry's
         // UI and receives pointer events directly rather than having them intercepted by overlays.
         const id = `probe-${nextId++}`;
         const target = document.createElement('div');
         target.dataset.titanProbe = id;
         target.style.position = 'fixed';
         target.style.top = '0';
         target.style.left = '0';
         target.style.zIndex = '2147483647';
         document.body.appendChild(target);

         const handle = mount(Component, {
            target,
            props: finalProps,
            context,
         });
         handles.set(id, {
            handle,
            target,
         });
         return {
            id,
            selector: `[data-titan-probe="${id}"]`,
         };
      },

      /**
       * Unmount a single probe and remove its container node.
       * @param {string} id - The probe id returned from `mount`.
       * @returns {void}
       */
      unmount(id) {
         const entry = handles.get(id);
         if (!entry) {
            return;
         }
         unmount(entry.handle, { outro: false });
         entry.target.remove();
         handles.delete(id);
      },

      /**
       * Unmount every active probe.
       * @returns {void}
       */
      unmountAll() {
         for (const id of [...handles.keys()]) {
            this.unmount(id);
         }
      },
   };
}
