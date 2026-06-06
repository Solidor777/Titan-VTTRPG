<script>
   import { setContext } from 'svelte';

   /**
    * @typedef {object} DocumentSheetShellProps
    * @property {import('~/document/reactive/ReactiveDocument.svelte.js').default} document - The reactive Document
    * bridge shared with descendant components.
    * @property {object} applicationState - The reactive UI state store shared with descendant components.
    * @property {import('svelte').Component} shell - The sheet body component to render inside the shell.
    */

   /** @type {DocumentSheetShellProps} */
   let { document, applicationState, shell } = $props();

   // Expose the document bridge and UI state to all descendant components via context.
   // 'document' is the ReactiveDocument bridge: all children read `document.data` (runes accessor).
   // These captures are intentional: both values are stable for the component's lifetime.
   // svelte-ignore state_referenced_locally
   setContext('document', document);
   // svelte-ignore state_referenced_locally
   setContext('applicationState', applicationState);
   // 'sheetDocument' always points at the owning sheet's top-level bridge; embedded-document providers
   // shadow 'document' but never this key, giving actor-coupled components a stable escape hatch.
   // svelte-ignore state_referenced_locally
   setContext('sheetDocument', document);
</script>

{#if shell}
   {@const Shell = shell}
   <Shell />
{/if}
