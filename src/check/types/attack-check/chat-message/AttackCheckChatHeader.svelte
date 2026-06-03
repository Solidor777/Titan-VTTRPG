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

   <!--Attack-->
   <div class="sub-label">
      {document.data.system.parameters.attackName}
   </div>

   <!--Type Label-->
   <div class="sub-label">
      {`${localize(document.data.system.parameters.attribute)} (${localize(document.data.system.parameters.skill)})`}
   </div>

   <!--Target Defense-->
   {#if document.data.system.parameters.targetDefense !== undefined}
      {`${document.data.system.parameters.type === 'melee' ? localize('melee') : localize('accuracy')} ${document.data.system.parameters.attackerRating} ${localize('versus')} ${localize('defense')} ${document.data.system.parameters.targetDefense}`}
   {/if}

   <!--Damage-->
   <div class="sub-label">
      {`${localize('damage')}: ${document.data.system.results.damage + document.data.system.parameters.damageMod}${document.data.system.parameters.plusExtraSuccessDamage ? ` + ${localize('extraSuccesses.short')}` : ''}`}
   </div>
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
