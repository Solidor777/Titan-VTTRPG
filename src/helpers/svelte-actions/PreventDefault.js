/**
 * Svelte action for prevent the default when an event is activated.
 * @param {Event} event - DOM event to prevent the default of.
 */
export default function preventDefault(event) {
   event.preventDefault();
}