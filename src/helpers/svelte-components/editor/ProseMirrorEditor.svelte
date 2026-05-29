<script>
   import { onMount } from 'svelte';

   /**
    * @type {{
    *   value?: string,
    *   editable?: boolean,
    *   toggled?: boolean,
    *   enriched?: string
    * }}
    */
   let {
      value = $bindable(''),
      editable = true,
      toggled = false,
      enriched = void 0,
   } = $props();

   /** @type {HTMLElement} The container the <prose-mirror> element is appended into. */
   let container;

   onMount(() => {
      // Build Foundry's native ProseMirror element seeded with the current value.
      const config = { value, toggled };
      if (enriched !== void 0) {
         config.enriched = enriched;
      }
      const editor = foundry.applications.elements.HTMLProseMirrorElement.create(config);
      if (!editable) {
         editor.setAttribute('disabled', '');
      }

      // Write committed edits back through the two-way binding.
      const onChange = () => {
         value = editor.value;
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
