/**
 * Delays a number of milliseconds before proceeding.
 * @param {number} milliseconds - The number of milliseconds to delay.
 * 1000 = 1 second.
 * @returns {Promise<unknown>} Returns after the delay has passed.
 */
export default function delay(milliseconds) {
   return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
