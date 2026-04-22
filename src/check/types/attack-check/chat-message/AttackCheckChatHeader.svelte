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

   <!--Attack-->
   <div class="sub-label">
      {$document.flags.titan.parameters.attackName}
   </div>

   <!--Type Label-->
   <div class="sub-label">
      {`${localize($document.flags.titan.parameters.attribute)} (${localize($document.flags.titan.parameters.skill)})`}
   </div>

   <!--Target Defense-->
   {#if $document.flags.titan.parameters.targetDefense !== undefined}
      {`${$document.flags.titan.parameters.type === 'melee' ? localize('melee') : localize('accuracy')} ${$document.flags.titan.parameters.attackerRating} ${localize('versus')} ${localize('defense')} ${$document.flags.titan.parameters.targetDefense}`}
   {/if}

   <!--Damage-->
   <div class="sub-label">
      {`${localize('damage')}: ${$document.flags.titan.results.damage + $document.flags.titan.parameters.damageMod}${$document.flags.titan.parameters.plusExtraSuccessDamage ? ` + ${localize('extraSuccesses.short')}` : ''}`}
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
