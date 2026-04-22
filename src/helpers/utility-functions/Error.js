/**
 * Sends an error message with the TITAN prefix. Displays a UI error notification and logs to the console. Also accepts
 * additional values to log, such as when wanting to log an object.
 * @param {string} message - The message to send.
 * @param {...*} args - Additional objects to log.
 */
export default function error(message, ...args) {
   const prefixed = `TITAN | ${message}`;
   ui?.notifications?.error(prefixed);
   console.error(prefixed, args);
}
