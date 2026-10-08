<script>
   import { getContext } from 'svelte';
   import ProseMirrorEditor from '~/helpers/svelte-components/editor/ProseMirrorEditor.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /** @type {import('~/document/reactive/ReactiveDocument.svelte.js').default} Reactive wrapper around the Document. */
   const documentBridge = getContext('document');

   /** @type {{ value?: string, disabled?: boolean, tooltip?: (string | object) }} */
   let { value = $bindable(), disabled = false, tooltip = void 0 } = $props();

   /** @type {boolean} Whether the current user owns the document and may edit its content. */
   const isOwner = $derived(documentBridge.data.isOwner);

   /** @type {string} The rendered (enriched) HTML shown while the toggled editor is inactive. */
   let enriched = $state('');

   /** @type {boolean} Whether the first enrichment has resolved, gating the editor's initial build. */
   let enrichedReady = $state(false);

   // Re-enrich whenever the committed value changes so the inactive (rendered) view stays current.
   // This only writes `enriched`, never `value`.
   $effect(() => {
      // Read the current value so the effect re-runs on change.
      const currentValue = value ?? '';

      // Enrich asynchronously, ignoring stale resolutions if the value changed in the meantime.
      let cancelled = false;
      foundry.applications.ux.TextEditor.implementation
         .enrichHTML(currentValue, {
            secrets: documentBridge.data.isOwner,
            relativeTo: documentBridge.doc,
         })
         .then((result) => {
            if (!cancelled) {
               enriched = result;
               enrichedReady = true;
            }
         });

      return () => {
         cancelled = true;
      };
   });

   /**
    * Saves the document's whole system data after the editor has written a committed edit to the bound value. The save
    * runs from the editor's `onchange` callback and not from an effect on `value`: whether such an effect re-runs
    * depends on the binding (it re-runs for an item description and does not for a rules element's message).
    * @returns {void}
    */
   function persist() {
      refreshSystemDocument(documentBridge.doc, disabled);
   }
</script>

<ProseMirrorEditor
   bind:value
   editable={isOwner && !disabled}
   toggled={true}
   {enriched}
   enrichedReady={enrichedReady}
   documentUUID={documentBridge.doc.uuid}
   onchange={persist}
   tooltip={tooltip}
   notOwner={!isOwner}
/>
