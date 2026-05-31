<script>
   import { onMount, untrack } from 'svelte';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type {{ value?: string, editable?: boolean, toggled?: boolean, enriched?: string, enrichedReady?: boolean, documentUUID?: string, tooltip?: (string | object), notOwner?: boolean, testId?: string }} */
   let {
      value = $bindable(''),
      editable = true,
      toggled = true,
      enriched = void 0,
      enrichedReady = true,
      documentUUID = void 0,
      tooltip = void 0,
      notOwner = false,
      testId = void 0,
   } = $props();

   /** @type {HTMLElement} The container the <prose-mirror> element is appended into. */
   let container;

   /** @type {(HTMLElement | undefined)} The live Foundry <prose-mirror> element, when mounted. */
   let editor = void 0;

   /** @type {(() => void) | undefined} Removes the active editor's change listener, when mounted. */
   let removeChangeListener = void 0;

   /** @type {(string | undefined)} The enriched HTML the current element was constructed with. */
   let builtEnriched = void 0;

   /**
    * Build Foundry's native <prose-mirror> element, seed it with the current value and enriched HTML,
    * wire its change event back to the two-way binding, and append it to the container. The element is
    * appended at runtime so it never receives Svelte's scoping attribute; its fill comes from Foundry
    * core CSS plus the inline flex styles set here.
    * @returns {void}
    */
   function buildEditor() {
      // Assemble the configuration for the native element.
      /** @type {{ value: string, toggled: boolean, enriched?: string, documentUUID?: string }} */
      const config = {
         value,
         toggled,
      };
      if (enriched !== void 0) {
         config.enriched = enriched;
      }
      if (documentUUID !== void 0) {
         config.documentUUID = documentUUID;
      }

      // Create the element and disable it when not editable.
      editor = foundry.applications.elements.HTMLProseMirrorElement.create(config);
      if (!editable) {
         editor.setAttribute('disabled', '');
      }

      // Fill the container top-to-bottom; scoped CSS cannot reach this runtime-appended element. Keep
      // flex:1 so the element grows to fill where the parent provides a definite height, but do NOT
      // zero min-height: that would remove Foundry's 150px min-height floor and collapse this
      // flex-basis:0 element to zero height.
      editor.style.flex = '1';

      // Record the enriched HTML this element was built with so the rebuild effect can detect when a
      // newer enriched value arrives from outside and the inactive view would otherwise be stale.
      builtEnriched = enriched;

      // Write committed edits back through the two-way binding.
      const onChange = () => {
         value = editor.value;
      };
      editor.addEventListener('change', onChange);
      removeChangeListener = () => editor.removeEventListener('change', onChange);

      container.appendChild(editor);
   }

   /**
    * Tear down the live editor: remove its change listener and detach it from the DOM.
    * @returns {void}
    */
   function destroyEditor() {
      if (removeChangeListener !== void 0) {
         removeChangeListener();
         removeChangeListener = void 0;
      }
      editor?.remove();
      editor = void 0;
   }

   onMount(() => {
      return () => {
         destroyEditor();
      };
   });

   // Single source of truth for building and rebuilding the element. The first build is deferred until
   // the parent's enrichment resolves (enrichedReady), avoiding a one-frame empty -> filled flash where
   // the element would otherwise be constructed with enriched='' and immediately rebuilt a tick later.
   // After the initial build, this rebuilds the element when the enriched HTML changes while the editor
   // is inactive: in toggled mode Foundry captures the enriched HTML once at construction, so after a
   // commit save() -> _refresh() repaints the inactive view from that stale snapshot. Rebuilding on a
   // new enriched value (whether it originated from this editor's own commit or an external update)
   // keeps the inactive view fresh. The active-state guard prevents tearing down the live ProseMirror
   // instance mid-edit, and rebuilds never write `value`, so they cannot loop with the persisting effect
   // in the parent input. `container` is bound before effects run, so building from this effect is safe.
   $effect(() => {
      // Track the enriched HTML and its readiness so changes to either re-run this effect.
      void enriched;
      void enrichedReady;

      untrack(() => {
         // Defer the first build until the parent's enrichment has resolved.
         if (!enrichedReady) {
            return;
         }

         // The element does not exist yet and enriched is ready: perform the initial build.
         if (editor === void 0) {
            buildEditor();
            return;
         }

         // Skip while the editor is actively being edited, or when the enriched HTML already matches
         // what the current element was constructed with.
         if (editor.classList.contains('active') || enriched === builtEnriched) {
            return;
         }

         // The committed content changed while inactive: rebuild so the rendered view reflects it.
         destroyEditor();
         buildEditor();
      });
   });
</script>

<div
   bind:this={container}
   class={notOwner ? 'editor rich-text not-owner' : 'editor rich-text'}
   data-testid={testId}
   use:tooltipAction={tooltip}
></div>

<style lang="scss">
   .editor {
      @include flex-column;

      align-items: stretch;
      flex: 1 1 auto;
      min-height: 0;

      // Override the `text-align: center` inherited from the `flex-group-top` ancestor so rich-text
      // content defaults to left; explicit ProseMirror alignments still set `text-align` per paragraph.
      text-align: left;
      width: 100%;
   }
</style>
