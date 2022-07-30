<script>
   import { setContext } from "svelte";

   // The actor document making this check
   export let storeDoc;

   // Initial check options
   export let checkData;

   // Setup context and store
   setContext("DialogObject", storeDoc);
</script>
