import { getContext } from 'svelte';

/**
 * Helper to read the owning Application from Svelte context. The application is provided at the mount
 * site (sheet or dialog) via the `application` context key.
 * @returns {object | undefined} The owning Application, or undefined if mounted without one (e.g. chat).
 */
export default function getApplication() {
   return getContext('application');
}
