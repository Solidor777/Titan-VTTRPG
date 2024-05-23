import { getContext } from 'svelte';

/**
 * Helper function for getting an application from inside a svelte component.
 * @returns {Application} The application that owns the svelte component.
 */
export default function getApplication() {
   return getContext('#external').application;
}
