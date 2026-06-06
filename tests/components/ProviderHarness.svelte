<script>
   import EmbeddedDocumentProvider from '~/document/reactive/EmbeddedDocumentProvider.svelte';
   import EmbeddedProbe from './EmbeddedProbe.svelte';

   /**
    * @typedef {object} ProviderHarnessProps
    * @property {object} doc - The live embedded document handed to the provider under test.
    */

   /** @type {ProviderHarnessProps} */
   const { doc } = $props();
</script>

<EmbeddedDocumentProvider {doc}>
   <EmbeddedProbe/>
</EmbeddedDocumentProvider>
