<svelte:options accessors={true} />

<script>
   import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
   export let elementRoot;
   export let storeDoc;
   console.log($storeDoc);
</script>

<ApplicationShell bind:elementRoot>
   <p>{$storeDoc.name}</p>
</ApplicationShell>
