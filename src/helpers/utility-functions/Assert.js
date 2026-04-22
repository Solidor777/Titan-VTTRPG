/**
 * Asserts a boolean to be true. If false, displays a UI error notification, logs a message with the TITAN prefix, and
 * also accepts additional values to log, such as when wanting to log an object.
 * @param {*} assertion - The boolean we expect to be true.
 * @param {string} [message] - The message to send.
 * @param {...*} args - Additional objects to log.
 * @returns {boolean} The result of the assertion.
 */
export default function assert(assertion, message, ...args) {
   if (!assertion) {
      ui?.notifications?.error(`TITAN | ${message}`);
   }
   console.assert(assertion, `TITAN | ${message}`, args);
   return assertion;
}
