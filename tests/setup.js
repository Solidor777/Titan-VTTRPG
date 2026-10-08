import { beforeEach } from 'vitest';

/** Minimal stand-in for foundry.abstract.Document (used for instanceof checks). */
class MockDocument {}

/**
 * Minimal recursive merge mirroring foundry.utils.mergeObject for plain objects.
 * @param {object} original - Target object (mutated).
 * @param {object} other - Source object.
 * @returns {object} The merged target.
 */
function mergeObject(original, other = {}) {
   for (const [key, value] of Object.entries(other)) {
      const isPlain = value && typeof value === 'object' && !Array.isArray(value);
      if (isPlain && original[key] && typeof original[key] === 'object') {
         mergeObject(original[key], value);
      } else {
         original[key] = value;
      }
   }
   return original;
}

/**
 * Minimal stand-in for foundry.utils.randomID: a random alphanumeric identifier.
 * @param {number} [length] - The desired identifier length.
 * @returns {string} The generated identifier.
 */
function randomID(length = 16) {
   return Math.random().toString(36).slice(2, 2 + length);
}

/**
 * Pass-through stand-in for foundry.utils.cleanHTML, which only the Foundry client defines: tooltip and rich-text
 * content passes through it, so components using them can mount. Unit tests do not verify sanitization;
 * the probe specs `component-probe-display` and `component-probe-buttons-tags` verify it live against core's cleaner.
 * @param {string} html - The HTML to clean.
 * @returns {string} The same HTML, unchanged.
 */
function cleanHTML(html) {
   return html;
}

globalThis.foundry = {
   abstract: { Document: MockDocument },
   utils: {
      cleanHTML,
      mergeObject,
      randomID,
   },
};

/** Minimal Hooks mock supporting on/off/call. */
class HooksMock {
   constructor() {
      this.handlers = {};
   }

   on(name, fn) {
      (this.handlers[name] ??= new Set()).add(fn);
      return fn;
   }

   off(name, fn) {
      this.handlers[name]?.delete(fn);
   }

   call(name, ...args) {
      for (const fn of [...(this.handlers[name] ?? [])]) {
         fn(...args);
      }
   }
}

// Fresh Hooks per test so subscriber registrations never leak across tests.
beforeEach(() => {
   globalThis.Hooks = new HooksMock();
});
