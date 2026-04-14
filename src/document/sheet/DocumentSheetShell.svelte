<svelte:options accessors={true}/>

<script>
   import { ApplicationShell } from '@typhonjs-fvtt/runtime/svelte/component/application';
   import { setContext } from 'svelte';

   /** @type {HTMLElement} The root element of the application. */
   export let elementRoot;

   /**
    * @type {TJSDocument} The reactive TJSDocument store wrapping the Document.
    */
   export let document = void 0;

   /**
    * @type {object} Writable store for managing the sheet's reactive state.
    */
   export let applicationState = void 0;

   /**
    * @type {typeof import('svelte').SvelteComponent}
    * The Svelte component that contains the sheet functionality.
    */
   export let shell = void 0;

   // Setup context variables
   setContext('document', document);
   setContext('applicationState', applicationState);
</script>

<ApplicationShell bind:elementRoot>
   <svelte:component this={shell}/>
</ApplicationShell>
