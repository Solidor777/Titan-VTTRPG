<svelte:options accessors={true}/>

<script>
   import {ApplicationShell} from '@typhonjs-fvtt/runtime/svelte/component/core';
   import {setContext} from 'svelte';

   /** @type object The root element of the application. */
   export let elementRoot;

   /** @type Document The Document that this sheet is for. */
   export let document = void 0;

   /** @type object Writable for storing the sheet's state. */
   export let applicationState = void 0;

   /** @type object Child component that contains the sheet functionality. */
   export let shell = void 0;

   // Setup context variables
   setContext('document', document);
   setContext('applicationState', applicationState);
</script>

<ApplicationShell bind:elementRoot>
   <svelte:component this={shell}/>
</ApplicationShell>
