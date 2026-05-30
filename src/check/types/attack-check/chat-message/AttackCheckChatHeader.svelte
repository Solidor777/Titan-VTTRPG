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

   <!--Attack-->
   <div class="sub-label">
      {document.data.flags.titan.parameters.attackName}
   </div>

   <!--Type Label-->
   <div class="sub-label">
      {`${localize(document.data.flags.titan.parameters.attribute)} (${localize(document.data.flags.titan.parameters.skill)})`}
   </div>

   <!--Target Defense-->
   {#if document.data.flags.titan.parameters.targetDefense !== undefined}
      {`${document.data.flags.titan.parameters.type === 'melee' ? localize('melee') : localize('accuracy')} ${document.data.flags.titan.parameters.attackerRating} ${localize('versus')} ${localize('defense')} ${document.data.flags.titan.parameters.targetDefense}`}
   {/if}

   <!--Damage-->
   <div class="sub-label">
      {`${localize('damage')}: ${document.data.flags.titan.results.damage + document.data.flags.titan.parameters.damageMod}${document.data.flags.titan.parameters.plusExtraSuccessDamage ? ` + ${localize('extraSuccesses.short')}` : ''}`}
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
