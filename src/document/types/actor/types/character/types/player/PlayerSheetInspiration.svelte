<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import {INSPIRATION_ICON} from '~/system/Icons.js';

   /** @type object Reference to the Document store. */
   const document = getContext('document');
</script>

<div class="button" use:tooltipAction="{localize('inspiration.desc')}">
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
      --titan-button-font-size: 24px;
   }
</style>
