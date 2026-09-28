<script module>
   /**
    * The contexts the most recently mounted probe read from its CheckDialogShell.
    * @type {{checkOptions?: import('svelte/store').Writable, setCheckOption?: (field: string, value: *) => void}}
    */
   export const captured = {};
</script>

<script>
   import { getContext } from 'svelte';

   // Hands the shell's Check Options store and tracked setter to the test.
   captured.checkOptions = getContext('checkOptions');
   captured.setCheckOption = getContext('setCheckOption');
</script>
