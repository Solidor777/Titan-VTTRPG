<script>
   import { getContext } from 'svelte';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import ProseMirrorEditor from '~/helpers/svelte-components/editor/ProseMirrorEditor.svelte';

   /** @type {import('~/document/reactive/ReactiveDocument.svelte.js').default} The document bridge. */
   const document = getContext('document');

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');

   /** @type {string} The working copy of the native description, edited locally and persisted on change. */
   let value = $state(document.data.description ?? '');

   /** @type {boolean} Guards the initial effect run so we do not persist on mount. */
   let initialized = false;

   // Persist committed edits to the native ActiveEffect description field. The bound value is local, so the
   // bridge update hook does not re-trigger this effect.
   $effect(() => {
      void value;
      if (!initialized) {
         initialized = true;
         return;
      }
      if (document.data.isOwner) {
         document.data.update({
            description: value,
         });
      }
   });
</script>

<div class="tab">
   <ScrollingContainer bind:scrollTop={$appState.tabs.description.scrollTop}>
      <div class={document.data.isOwner ? 'editor rich-text' : 'editor rich-text not-owner'}>
         <ProseMirrorEditor
            bind:value
            editable={document.data.isOwner}
         />
      </div>
   </ScrollingContainer>
</div>

<style lang="scss">
   .tab {
      @include flex-column;
      @include flex-group-center;
      @include panel-2;
      @include padding-standard;

      height: 100%;
      width: 100%;

      .editor {
         @include flex-row;
         @include flex-group-left;

         width: 100%;
         height: 100%;
      }
   }
</style>
