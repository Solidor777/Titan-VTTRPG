<script>
   import { getContext } from 'svelte';
   import { localize } from '~/helpers/Utility.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';

   const document = getContext('DocumentStore');
</script>

<div class="button" use:tooltip={{ content: localize('inspiration') }}>
   <IconButton
      icon={$document.system.inspiration ? 'fas fa-sun' : ''}
      on:click={() => {
         $document.character.toggleInspiration();
      }}
   />
</div>

<style lang="scss">
   @import '../../../../../Styles/Mixins.scss';

   .button {
      --icon-button-padding: 0;
      --icon-button-font-size: 1.5rem;
   }
</style>
