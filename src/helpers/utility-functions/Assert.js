/**
 * Asserts a boolean to be true. If false, logs a message with the TITAN prefix.
 * Also accepts additional values to log, such as when wanting to log an object.
 * @param {*} assertion - The boolean we expect to be true.
 * @param {string} [message] - The message to send.
 * @param {...*} args - Additional objects to log.
 */
export default function assert(assertion, message, ...args) {
   console.assert(
      assertion,
      `TITAN | ${message}`,
      args,
   );
   return assertion;
}
