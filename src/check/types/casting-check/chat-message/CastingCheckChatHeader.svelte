<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';
   import CheckChatMessageItemHeader from '~/check/chat-message/CheckChatMessageItemHeader.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<CheckChatMessageItemHeader
   attribute={document.data.system.parameters.attribute}
   img={document.data.system.parameters.img}
>
   <!--Label-->
   <div class="label">
      {document.data.system.parameters.itemName}
   </div>

   <!--Type Label-->
   <div class="sub-label">
      {`${localize(document.data.system.parameters.attribute)} (${localize(document.data.system.parameters.skill)})`}
   </div>

   <!--Tradition-->
   {#if document.data.system.parameters.tradition !== '' &&
   document.data.system.parameters.tradition !== localize('any')}
      <div class="sub-label">
         {document.data.system.parameters.tradition}
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
