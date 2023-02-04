<script>
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import { getContext } from 'svelte';

   // Collapsed object
   export let item = void 0;

   // Reference to the docuement
   const document = getContext('DocumentStore');
</script>

<!-- svelte-ignore missing-declaration -->
<IconButton
   icon={'fas fa-comment'}
   on:click={async () => {
      await item.sendToChat({
         user: game.user.id,
         speaker: ChatMessage.getSpeaker({ actor: $document }),
         rollMode: game.settings.get('core', 'rollMode'),
      });
   }}
/>
