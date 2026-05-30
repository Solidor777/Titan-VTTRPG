<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';
   import CheckChatMessageItemHeader from '~/check/chat-message/CheckChatMessageItemHeader.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<CheckChatMessageItemHeader
   attribute={document.data.flags.titan.parameters.attribute}
   img={document.data.flags.titan.parameters.img}
>
   <!--Label-->
   <div class="label">
      {document.data.flags.titan.parameters.itemName}
   </div>

   <!--Type Label-->
   <div class="sub-label">
      {`${localize(document.data.flags.titan.parameters.attribute)} (${localize(document.data.flags.titan.parameters.skill)})`}
   </div>

   <!--Tradition-->
   {#if document.data.flags.titan.parameters.tradition !== '' &&
   document.data.flags.titan.parameters.tradition !== localize('any')}
      <div class="sub-label">
         {document.data.flags.titan.parameters.tradition}
      </div>
   {/if}
</CheckChatMessageItemHeader>

<style lang="scss">
   .label {
      @include flex-row;
      @include font-size-large;
   }

   .sub-label {
      @include flex-row;
      @include font-size-small;
   }
</style>
