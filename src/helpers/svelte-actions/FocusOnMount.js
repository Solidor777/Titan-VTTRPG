/**
 * Svelte action that focuses and selects an element's contents when it mounts, used to make inline
 * text inputs immediately editable.
 * @param {HTMLElement} element - The element to focus and select on mount.
 * @returns {void}
 */
export default function focusOnMount(element) {
   element.focus();
   element.select();
}
