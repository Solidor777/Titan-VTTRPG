<script>
   import { getContext } from 'svelte';
   import { getSetting, localize } from '~/helpers/utility';
   import ChatReportConfirmRegainingResolveButton from './ChatReportConfirmRegainingResolveButton.svelte';
   import ChatReportRemoveExpiredEffectsButton from './ChatReportRemoveExpiredEffectsButton.svelte';
   import ChatResolveRegained from './ChatResolveRegained.svelte';

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
         {#if chatContext.icon}
            <i class={chatContext.icon} />
         {/if}
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
      <div class="messages">
         {#each chatContext.message as message}
            <div class="message">{@html message}</div>
         {/each}
      </div>
   {/if}

   <!--Resolve regained-->
   {#if chatContext.resolveRegained && getSetting('reportRegainingResolve') === true}
      <ChatResolveRegained
         resolveRegained={chatContext.resolveRegained}
         resolveValue={$document.flags.titan.chatContext.resolveRegainConfirmed
            ? chatContext.newResolve
            : chatContext.initialResolve}
         resolveMax={chatContext.maxResolve}
      />
   {/if}

   <!--Regain Resolve Button-->
   {#if chatContext.resolveRegained && !$document.flags.titan.chatContext.resolveRegainConfirmed && getSetting('autoRegainResolve') === 'showButton'}
      <div class="button">
         <ChatReportConfirmRegainingResolveButton />
      </div>
   {/if}

   <!--Remove Expired Effects Button-->
   {#if $document.flags.titan.chatContext.removeExpiredEffectsConfirmed === false && getSetting('autoRemoveExpiredEffects') === 'showButton'}
      <div class="button">
         <ChatReportRemoveExpiredEffectsButton />
      </div>
   {/if}
</div>

<style lang="scss">
   @import '../styles/Mixins.scss';

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

            .label {
               @include flex-row;
               @include flex-group-center;
               flex-wrap: wrap;
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

      .messages {
         @include flex-column;
         @include flex-group-top;
         width: 100%;
         margin-top: 0.25rem;

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
      }

      .button {
         @include flex-row;
         @include flex-group-center;
         width: 100%;
         margin-top: 0.5rem;
      }
   }
</style>
