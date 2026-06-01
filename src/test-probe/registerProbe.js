import { mount, unmount, createRawSnippet } from 'svelte';
import componentRegistry from '~/test-probe/componentRegistry.js';

/**
 * Resolve a `{ __probeFn: kind, ... }` marker into a real function. Function props cannot cross the
 * Node<->page boundary, so the spec supplies a serializable marker that this resolver turns into one of
 * a small fixed library of pure helpers (sufficient for list-style components such as `FiltereedList`).
 * @param {{ __probeFn: string, component?: string }} marker - The function marker to resolve.
 * @returns {Function} The resolved helper function.
 * @throws {Error} When the marker kind is unknown or names an unregistered component.
 */
function resolveProbeFunction(marker) {
   switch (marker.__probeFn) {
      // Always-true predicate, e.g. a `filterFunction` that keeps every entry.
      case 'returnTrue':
         return () => true;

      // Identity over the entry, e.g. a `mapFunction`/`propsFunction` that passes the entry through.
      case 'returnEntry':
         return (entry) => entry;

      // Selective predicate keeping only entries whose `keep` flag is truthy, e.g. a `filterFunction`.
      case 'entryKeep':
         return (entry) => entry.keep;

      // Props supplier labelling an entry by its original index, e.g. a `propsFunction` for `LabelTag`.
      case 'labelFromIdx':
         return (entry, idx) => ({ label: String(idx) });

      // Constant supplier of a registered component, e.g. a `componentFunction`.
      case 'returnComponent': {
         const resolved = componentRegistry[marker.component];
         if (!resolved) {
            throw new Error(`resolveProbeFunction: unknown component "${marker.component}"`);
         }
         return () => resolved;
      }

      default:
         throw new Error(`resolveProbeFunction: unknown function marker "${marker.__probeFn}"`);
   }
}

/**
 * Recursively replace `{ __probeComponent: name }` markers with the registered component constructor and
 * `{ __probeFn: kind }` markers with a resolved helper function (see `resolveProbeFunction`).
 * @param {*} value - Any prop value possibly containing component or function markers.
 * @returns {*} The value with markers resolved to component constructors or functions.
 */
function resolveProbeComponents(value) {
   if (Array.isArray(value)) {
      return value.map(resolveProbeComponents);
   }
   if (value && typeof value === 'object') {
      if (typeof value.__probeComponent === 'string') {
         const resolved = componentRegistry[value.__probeComponent];
         if (!resolved) {
            throw new Error(`resolveProbeComponents: unknown component "${value.__probeComponent}"`);
         }
         return resolved;
      }
      if (typeof value.__probeFn === 'string') {
         return resolveProbeFunction(value);
      }
      const out = {};
      for (const [k, v] of Object.entries(value)) {
         out[k] = resolveProbeComponents(v);
      }
      return out;
   }
   return value;
}

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

   /**
    * Unmount a single probe by id and remove its container node.
    * @param {string} id - The probe id returned from `mount`.
    * @returns {void}
    */
   function unmountProbe(id) {
      const entry = handles.get(id);
      if (!entry) {
         return;
      }
      unmount(entry.handle, { outro: false });
      entry.target.remove();
      handles.delete(id);
   }

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

         const finalProps = { ...props };

         // Resolve any `{ __probeComponent: name }` markers (and arrays/object values containing them) into
         // the registered component constructor so component-valued props survive the page boundary.
         for (const [key, value] of Object.entries(finalProps)) {
            finalProps[key] = resolveProbeComponents(value);
         }

         // Convert a `text` shorthand into a renderable children snippet when no children supplied.
         if (typeof finalProps.text === 'string' && finalProps.children === undefined) {
            const text = finalProps.text;
            finalProps.children = createRawSnippet(() => {
               return {
                  render: () => `<span></span>`,
                  setup: (element) => {
                     element.textContent = text;
                  },
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
       * Unmount a single probe by id and remove its container node.
       * @param {string} id - The probe id returned from `mount`.
       * @returns {void}
       */
      unmount: unmountProbe,

      /**
       * Unmount every active probe.
       * @returns {void}
       */
      unmountAll() {
         for (const id of [...handles.keys()]) {
            unmountProbe(id);
         }
      },
   };
}
