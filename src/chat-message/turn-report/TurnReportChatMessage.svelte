<script>
   import { getContext } from 'svelte';
   import { getSetting, localize } from '~/helpers/utility';
   import ChatEffects from '~/chat-message/ChatEffects.svelte';
   import TurnReportConfirmResolveRegainButton from './TurnReportConfirmResolveRegainButton.svelte';
   import TurnReportRemoveExpiredEffectsButton from './TurnReportRemoveExpiredEffectsButton.svelte';

   // Document reference
   const document = getContext('DocumentStore');
   const chatContext = $document.flags.titan.chatContext;
</script>

<div class="report">
   <!--Img-->
   {#if chatContext.img}
      <img src={chatContext.img} alt="img" />
   {/if}

   <!--Header-->
   <div class="header">
      <!--Main Header-->
      <div class="main">
         <!--Icon-->
         <i class={'fas fa-clock'} />
         {chatContext.header}
      </div>

      <!--Sub Header-->
      {#if chatContext.subHeader}
         <div class="sub">
            {chatContext.subHeader}
         </div>
      {/if}
   </div>

   <!--Messages-->
   {#if chatContext.message && chatContext.message.length > 0}
      {#each chatContext.message as message}
         <div class="message">{@html message}</div>
      {/each}
   {/if}

   <!--Resolve regained-->
   {#if chatContext.resolveRegain}
      <!--Current Resolve-->
      <div class="message">
         {`${localize('resolve')}: ${
            $document.flags.titan.chatContext.resolve.value
         } / ${$document.flags.titan.chatContext.resolve.max}`}
      </div>

      <!--If confirmed, show how much was was regained-->
      {#if $document.flags.titan.chatContext.resolveRegain.confirmed}
         <div class="message">
            <i class="fas fa-bolt" />
            <div>
               {localize('regained%xResolve').replace(
                  '%x',
                  chatContext.resolveRegain.total
               )}
            </div>
         </div>
      {:else}
         <div class="button">
            <TurnReportConfirmResolveRegainButton />
         </div>
      {/if}
   {/if}

   <!--Effects-->
   {#if chatContext.permanentEffects || chatContext.turnEndEffects || chatContext.turnStartEffects || chatContext.expiredEffects}
      <ChatEffects />
   {/if}

   <!--Remove Expired Effects Button-->
   {#if $document.flags.titan.chatContext.expiredEffectsRemoved === false && getSetting('autoRemoveExpiredEffects') === 'showButton'}
      <div class="button">
         <TurnReportRemoveExpiredEffectsButton />
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

      img {
         @include panel-1;
         @include border;
         width: 5rem;
         margin-bottom: 0.5rem;
      }

      .header {
         @include flex-column;
         @include flex-group-top;
         @include panel-1;
         @include border;
         width: 100%;
         padding: 0.25rem;

         .main {
            @include flex-row;
            @include flex-group-center;
            @include font-size-large;
            width: 100%;
            flex-wrap: wrap;

            i {
               margin-right: 0.25rem;
            }
         }

         .sub {
            @include flex-row;
            @include flex-group-center;
            width: 100%;
            margin-top: 0.25rem;
            flex-wrap: wrap;
         }
      }

      .message {
         @include flex-row;
         @include flex-group-center;
         margin-top: 0.25rem;
         flex-wrap: wrap;

         &:not(:last-child) {
            @include border-bottom;
            padding-bottom: 0.25rem;
         }

         .fas {
            margin-right: 0.25rem;
         }
      }

      .button {
         @include flex-row;
         @include flex-group-center;
         width: 100%;
         margin-top: 0.5rem;
      }
   }
</style>
