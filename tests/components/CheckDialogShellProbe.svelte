<script module>
   /**
    * @typedef {object} CapturedShellContexts
    * @property {import('svelte/store').Readable} [checkOptions] The shell's Check Options context.
    * @property {(field: string, value: *) => void} [setCheckOption] The shell's tracked setter.
    * @property {(field: string, value: *) => void} [writeThroughContext] Assigns a field through the context.
    * @property {(field: string, value: *) => void} [pushThroughContext] Pushes onto an array field through the context.
    */

   /**
    * The contexts the most recently mounted probe read from its CheckDialogShell, and functions that write straight
    * through the `'checkOptions'` context the way a stray dialog field would.
    * @type {CapturedShellContexts}
    */
   export const captured = {};
</script>

<script>
   import { getContext } from 'svelte';

   /** @type {import('svelte/store').Readable} The shell's Check Options context. */
   const checkOptions = getContext('checkOptions');

   // Hands the shell's Check Options context and tracked setter to the test.
   captured.checkOptions = checkOptions;
   captured.setCheckOption = getContext('setCheckOption');

   /**
    * Assigns a Check Options field through the store context, bypassing the tracked setter.
    * @param {string} field - The field to assign.
    * @param {*} value - The value to assign.
    * @returns {void}
    */
   captured.writeThroughContext = (field, value) => {
      $checkOptions[field] = value;
   };

   /**
    * Pushes onto a Check Options array field through the store context, bypassing the tracked setter.
    * @param {string} field - The array field to push onto.
    * @param {*} value - The value to push.
    * @returns {void}
    */
   captured.pushThroughContext = (field, value) => {
      $checkOptions[field].push(value);
   };
</script>
