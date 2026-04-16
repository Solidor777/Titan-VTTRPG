<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';
   import CheckChatMessageItemHeader from '~/check/chat-message/CheckChatMessageItemHeader.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<CheckChatMessageItemHeader
   attribute={$document.flags.titan.parameters.attribute}
   img={$document.flags.titan.parameters.img}
>
   <!--Label-->
   <div class="label">
      {$document.flags.titan.parameters.itemName}
   </div>

   <!--Type Label-->
   <div class="sub-label">
      {`${localize($document.flags.titan.parameters.attribute)} (${localize($document.flags.titan.parameters.skill)})`}
   </div>

   <!--Tradition-->
   {#if $document.flags.titan.parameters.tradition !== '' &&
   $document.flags.titan.parameters.tradition !== localize('any')}
      <div class="sub-label">
         {$document.flags.titan.parameters.tradition}
      </div>
   {/if}
</CheckChatMessageItemHeader>
