/**
 * Sends an error message with the TITAN prefix.
 * Also accepts additional values to log, such as when wanting to log an object.
 * @param {string}   message        The message to send.
 * @param {boolean}  [trace = true] Whether to perform a trace call.
 * @param {...}      args              Additional objects to log.
 */
export default function error(message, trace = true, ...args) {
   console.error(`TITAN | ${message}`);
   for (const arg of args) {
      (console.log(arg));
   }
   if (trace) {
      console.trace();
   }
}
