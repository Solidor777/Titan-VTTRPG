import {getContext} from 'svelte';

/**
 * Helper function for a Svelte Component's Application.
 * @returns {Application} The Svelte Component's Application.
 */
export default function getApplication() {
   return getContext('#external').application;
}
