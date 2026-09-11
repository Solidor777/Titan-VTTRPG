<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';
   import CheckChatMessageItemHeader from '~/check/chat-message/CheckChatMessageItemHeader.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {string} The attack-type-and-rating-versus-defense summary line. */
   const targetDefenseLabel = $derived.by(() => {
      const typeLabel = document.data.system.parameters.type === 'melee'
         ? localize('melee')
         : localize('accuracy');

      return `${typeLabel} ${document.data.system.parameters.attackerRating} ${localize('versus')} ` +
         `${localize('defense')} ${document.data.system.parameters.targetDefense}`;
   });

   /** @type {string} The damage total, with an extra-successes suffix when applicable. */
   const damageLabel = $derived.by(() => {
      const total = document.data.system.results.damage + document.data.system.parameters.damageMod;
      const suffix = document.data.system.parameters.plusExtraSuccessDamage
         ? ` + ${localize('extraSuccesses.short')}`
         : '';

      return `${localize('damage')}: ${total}${suffix}`;
   });
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
      {targetDefenseLabel}
   {/if}

   <!--Damage-->
   <div class="sub-label">
      {damageLabel}
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
