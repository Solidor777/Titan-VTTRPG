<script>
   import CheckLabel from "./components/CheckLabel.svelte";

   // Context object
   export let chatContext = void 0;
</script>

<CheckLabel label={chatContext.label} typeLabel={chatContext.typeLabel} />
