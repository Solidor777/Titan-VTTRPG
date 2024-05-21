/**
 * Sends a warning message with the TITAN prefix.
 * Also accepts additional values to log, such as when wanting to log an object.
 * @param {string}   message           asThe message to send.
 * @param {boolean}  [trace = false]   Whether to perform a trace call.
 * @param {...}      args              Additional objects to log.
 */
export default function warn(message, trace = false, ...args) {
   console.warn(`TITAN | ${message}`);
   for (const arg of args) {
      (console.log(arg));
   }
   if (trace) {
      console.trace();
   }
}
