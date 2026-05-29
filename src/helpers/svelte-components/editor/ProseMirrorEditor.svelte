<script>
   import { onMount } from 'svelte';

   /**
    * @type {{
    *   document: foundry.abstract.Document,
    *   fieldName: string,
    *   value?: string,
    *   editable?: boolean,
    *   toggled?: boolean,
    *   enriched?: string,
    * }}
    */
   let {
      document,
      fieldName,
      value = '',
      editable = true,
      toggled = false,
      enriched = undefined,
   } = $props();

   /** @type {HTMLElement} The container the prose-mirror element is appended into. */
   let container;

   onMount(() => {
      // Build Foundry's native ProseMirror custom element.
      // `create()` accepts `name` directly in the config object and sets it as a property.
      // `documentUUID` in config causes the factory to populate both dataset keys used by
      // the element's internal `fromUuid` lookup (dataset.documentUuid / dataset.documentUUID).
      const editor = foundry.applications.elements.HTMLProseMirrorElement.create({
         name: fieldName,
         value,
         toggled,
         enriched,
         ...(document?.uuid ? { documentUUID: document.uuid } : {}),
      });

      if (!editable) {
         editor.setAttribute('disabled', '');
      }

      // `change` is dispatched by `save()` only when the value has actually changed,
      // after `_value` has been updated — `editor.value` holds the committed HTML at
      // that point.
      const onChange = () => {
         document.update({ [fieldName]: editor.value });
      };
      editor.addEventListener('change', onChange);

      container.appendChild(editor);

      return () => {
         editor.removeEventListener('change', onChange);
         editor.remove();
      };
   });
</script>

<div bind:this={container} class="editor rich-text"></div>

<style lang="scss">
   .editor {
      @include flex-row;
      @include flex-group-left;

      width: 100%;
      height: 100%;
   }
</style>
