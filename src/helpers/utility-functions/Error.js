/**
 * Sends an error message with the TITAN prefix.
 * Also accepts additional values to log, such as when wanting to log an
 * object.
 * @param {string} message - The message to send.
 * @param {...} args - Additional objects to log.
 */
export default function error(message, ...args) {
   console.error(`TITAN | ${message}`, args);
}
