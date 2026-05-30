<script>
   import { getContext, untrack } from 'svelte';
   import ProseMirrorEditor from '~/helpers/svelte-components/editor/ProseMirrorEditor.svelte';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type {import('~/document/reactive/ReactiveDocument.svelte.js').default} The document bridge. */
   const documentBridge = getContext('document');

   /**
    * @type {{
    *   path: string,
    *   disabled?: boolean,
    *   tooltip?: (string | object)
    * }}
    */
   let { path, disabled = false, tooltip = void 0 } = $props();

   /** @type {string} Local mirror of the edited field, two-way bound to the editor. */
   let value = $state(untrack(() => foundry.utils.getProperty(documentBridge.doc, path)));

   /** @type {boolean} Guards the initial effect run so we do not persist on mount. */
   let initialized = false;

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
