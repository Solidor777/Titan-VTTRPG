<script>
   import { getContext, untrack } from 'svelte';
   import ProseMirrorEditor from '~/helpers/svelte-components/editor/ProseMirrorEditor.svelte';

   /** @type {import('~/document/reactive/ReactiveDocument.svelte.js').default} Reactive wrapper around the Document. */
   const documentBridge = getContext('document');

   /** @type {{ path: string, disabled?: boolean, tooltip?: (string | object) }} */
   let { path, disabled = false, tooltip = void 0 } = $props();

   /** @type {string} Local mirror of the edited field, two-way bound to the editor. */
   let value = $state(untrack(() => foundry.utils.getProperty(documentBridge.doc, path)));

   /** @type {boolean} Whether the current user owns the document and may edit its content. */
   const isOwner = $derived(documentBridge.data.isOwner);

   /** @type {string} The rendered (enriched) HTML shown while the toggled editor is inactive. */
   let enriched = $state('');

   /** @type {boolean} Whether the first enrichment has resolved, gating the editor's initial build. */
   let enrichedReady = $state(false);

   /** @type {boolean} Guards the initial effect run so we do not persist on mount. */
   let initialized = false;

   // Re-enrich whenever the committed value changes so the inactive (rendered) view stays current.
   // This only writes `enriched`, never `value`, so it cannot re-trigger the persist effect below.
   $effect(() => {
      // Read the current value so the effect re-runs on change.
      const currentValue = value;

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

   // Persist committed edits to the document. The local mirror is not derived from the bridge, so
   // the resulting update hook does not re-trigger this effect.
   $effect(() => {
      const newValue = value;
      if (!initialized) {
         initialized = true;
         return;
      }
      documentBridge.doc.update({ [path]: newValue });
   });
</script>

<ProseMirrorEditor
   bind:value
   editable={isOwner && !disabled}
   toggled={true}
   {enriched}
   enrichedReady={enrichedReady}
   documentUUID={documentBridge.doc.uuid}
   tooltip={tooltip}
   notOwner={!isOwner}
/>
