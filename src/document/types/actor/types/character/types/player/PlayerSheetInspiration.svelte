<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import {INSPIRATION_ICON} from '~/system/Icons.js';

   const document = getContext('document');
</script>

<div class="button" use:tooltip={{ content: localize('inspiration.desc') }}>
   <IconButton
      icon={$document.system.inspiration ? INSPIRATION_ICON: ''}
      on:click={() => {
         $document.system.toggleInspiration();
      }}
   />
</div>

<style lang="scss">
   .button {
      --titan-icon-button-padding: 0;
      --titan-icon-button-font-size: 24px;
   }
</style>
