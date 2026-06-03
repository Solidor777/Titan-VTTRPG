<script>
   import { getContext, setContext } from 'svelte';
   import PrivateRollChatMessage
      from '~/document/types/chat-message/components/messages/ChatMessagePrivateRollMessage.svelte';

   /** @type {object} The reactive Document store provided by TitanChatMessage#renderHTML. */
   const { documentStore = void 0 } = $props();

   // Expose the document to descendant components via context.
   setContext('document', documentStore);

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Selects the Svelte component to render. Non-GM viewers of a blind message see the private-roll
    * placeholder; everyone else sees the subtype's declared component.
    * @returns {object | undefined} The Svelte component class to render, if any.
    */
   function selectComponent() {
      if (game.user.isGM || !document.data.blind) {
         return document.data.system.component;
      }

      return PrivateRollChatMessage;
   }
</script>

{#if document.data}
   {@const SelectedComponent = selectComponent()}
   {#if SelectedComponent}
      <div>
         <SelectedComponent/>
      </div>
   {/if}
{/if}
