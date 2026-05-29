<script>
   import { getContext } from 'svelte';
   import ProseMirrorEditor from '~/helpers/svelte-components/editor/ProseMirrorEditor.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type {import('~/document/reactive/ReactiveDocument.svelte.js').default} The document bridge. */
   const documentBridge = getContext('document');

   /**
    * @type {{
    *   value?: string,
    *   disabled?: boolean,
    *   tooltip?: (string | object)
    * }}
    */
   let { value = $bindable(''), disabled = false, tooltip = void 0 } = $props();

   /** @type {boolean} Guards the initial effect run so we do not persist on mount. */
   let initialized = false;

   // Persist committed edits by writing the whole system blob (original mechanism, no path needed).
   // The bound value is not derived from the bridge, so the update hook does not re-trigger this.
   $effect(() => {
      void value;
      if (!initialized) {
         initialized = true;
         return;
      }
      refreshSystemDocument(documentBridge.doc, disabled);
   });
</script>

<div
   class={documentBridge.data.isOwner ? 'editor rich-text' : 'editor rich-text not-owner'}
   use:tooltipAction={tooltip}
>
   <ProseMirrorEditor
      bind:value
      editable={documentBridge.data.isOwner && !disabled}
   />
</div>

<style lang="scss">
   .editor {
      @include flex-row;
      @include flex-group-left;

      width: 100%;
      height: 100%;
   }
</style>
