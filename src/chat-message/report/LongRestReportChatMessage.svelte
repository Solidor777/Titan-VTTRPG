<script>
   import { getContext } from 'svelte';
   import { localize } from '~/helpers/utility';
   import ChatResource from '~/chat-message/ChatResource.svelte';
   import ReportHeader from '~/chat-message/report/components/ReportHeader.svelte';

   // Document reference
   const document = getContext('DocumentStore');
   const chatContext = $document.flags.titan;
</script>

<div class="report">
   <!--Header-->
   <ReportHeader icon={'fas fa-bed'} label={localize('tookALongRest')} />

   <!--Messages-->
   <div class="message">{localize('combatEffectsRemoved')}</div>
   <div class="message">{localize('staminaAndResolveRestored')}</div>

   <!--Wounds healed-->
   {#if chatContext.woundsHealed}
      <div class="message">
         {localize('healed%xWounds').replace('%x', chatContext.woundsHealed)}
      </div>
      <!--Wounds-->
      <div class="message">
         <ChatResource
            icon={'fas fa-face-head-bandage'}
            label={localize('wounds')}
            value={chatContext.wounds.value}
            max={chatContext.wounds.max}
         />
      </div>
   {/if}
</div>

<style lang="scss">
   @import '../../styles/Mixins.scss';

   .report {
      @include flex-column;
      @include flex-group-top;
      @include font-size-normal;
      width: 100%;
      font-weight: bold;

      .message {
         @include flex-row;
         @include flex-group-center;
         margin-top: 0.5rem;
         flex-wrap: wrap;
         padding-bottom: 0.5rem;

         &:not(:last-child) {
            @include border-bottom;
         }
      }
   }
</style>
