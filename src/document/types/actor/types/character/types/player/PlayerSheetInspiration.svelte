<script>
   import { getContext } from 'svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import { INSPIRATION_ICON } from '~/system/Icons.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<div class="button">
   <IconButton
      tooltip={'inspiration.desc'}
      icon={document.data.system.inspiration ? INSPIRATION_ICON: ''}
      onclick={() => {
         document.data.system.toggleInspiration();
      }}
   />
</div>

<style lang="scss">
   .button {
      --titan-icon-button-padding: 0;
      --titan-button-font-size: 24px;
   }
</style>
