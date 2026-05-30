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

globalThis.foundry = {
   abstract: { Document: MockDocument },
   utils: { mergeObject },
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
