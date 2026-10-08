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

   // Persist committed edits by writing the whole system blob (no path needed). The editor calls this after it has
   // written the edit to the bound value. An effect on the bound value did not save a Turn Message edit (measured: no
   // update was made, `.superpowers/sdd/test-suite-rewrite/phase-6/partB/turnmessage-persist-probe-3.log`).
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
