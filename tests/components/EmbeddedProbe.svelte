<script>
   import { getContext } from 'svelte';

   /** @type {object} The nearest document bridge ('document' context — possibly an embedded one). */
   const document = getContext('document');

   /** @type {object|undefined} The owning sheet's top-level bridge ('sheetDocument' context). */
   const sheetDocument = getContext('sheetDocument');
</script>

<span data-testid="document-id">{document?.data?.id ?? 'missing'}</span>
<span data-testid="document-value">{document?.data?.system?.value ?? 'missing'}</span>
<span data-testid="sheet-document-id">{sheetDocument?.data?.id ?? 'missing'}</span>
