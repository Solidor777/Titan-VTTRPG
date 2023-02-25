<script>
   import { getContext } from 'svelte';
   import { localize } from '~/helpers/utility';
   import ChatEffects from '~/chat-message/ChatEffects.svelte';
   import ReportRemoveExpiredEffectsButton from '~/chat-message/report/components/ReportRemoveExpiredEffectsButton.svelte';
   import ReportConfirmApplyHealingButton from '~/chat-message/report/components/ReportConfirmApplyHealingButton.svelte';
   import ReportConfirmApplyDamageButton from '~/chat-message/report/components/ReportConfirmApplyDamageButton.svelte';
   import ReportHeader from '~/chat-message/report/components/ReportHeader.svelte';
   import ChatFastHealingTag from '~/chat-message/ChatFastHealingTag.svelte';
   import ChatPersistentDamageTag from '~/chat-message/ChatPersistentDamageTag.svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';

   // Document reference
   const document = getContext('DocumentStore');
   const chatContext = $document.flags.titan.chatContext;
</script>

<div class="report">
   <!--Header-->
   <ReportHeader icon={'fas fa-hourglass-end'} label={localize('turnEnd')} />

   <!--Messages-->
   {#if chatContext.message}
      {#each Object.values(chatContext.message) as message}
         <div class="message">
            <RichText text={message} />
         </div>
      {/each}
   {/if}

   <!--Effects-->
   {#if chatContext.expiredEffects}
      <ChatEffects />
   {/if}

   <!--Fast Healing-->
   {#if chatContext.fastHealing}
      <div class="tag">
         <ChatFastHealingTag fastHealing={chatContext.fastHealing} />
      </div>
   {/if}

   <!--Persistent Damage-->
   {#if chatContext.persistentDamage}
      <div class="tag">
         <ChatPersistentDamageTag
            persistentDamage={chatContext.persistentDamage}
         />
      </div>
   {/if}

   <!--Stamina-->
   {#if chatContext.stamina}
      <div class="section">
         {`${localize('stamina')}: ${
            $document.flags.titan.chatContext.stamina.value
         } / ${$document.flags.titan.chatContext.stamina.max}`}
      </div>
   {/if}

   <!--Wounds-->
   {#if chatContext.wounds}
      <div class="section">
         {`${localize('wounds')}: ${
            $document.flags.titan.chatContext.wounds.value
         } / ${$document.flags.titan.chatContext.wounds.max}`}
      </div>
   {/if}

   <!--Stamina-->
   {#if chatContext.stamina}
      <div class="section">
         {`${localize('stamina')}: ${
            $document.flags.titan.chatContext.stamina.value
         } / ${$document.flags.titan.chatContext.stamina.max}`}
      </div>
   {/if}

   <!--Wounds-->
   {#if chatContext.wounds}
      <div class="section">
         {`${localize('wounds')}: ${
            $document.flags.titan.chatContext.wounds.value
         } / ${$document.flags.titan.chatContext.wounds.max}`}
      </div>
   {/if}

   <!--Healing applied-->
   {#if chatContext.healingApplied}
      <!--If confirmed, show how much was was regained-->
      {#if $document.flags.titan.chatContext.healingApplied.confirmed === true}
         <div class="section">
            <i class="fas fa-heart" />
            <div>
               {localize('healed%xDamage').replace(
                  '%x',
                  chatContext.healingApplied.total
               )}
            </div>
         </div>
      {:else if $document.flags.titan.chatContext.healingApplied.confirmed === false}
         <div class="button">
            <ReportConfirmApplyHealingButton />
         </div>
      {/if}
   {/if}

   <!--Damage applied-->
   {#if chatContext.damageApplied}
      <!--If confirmed, show how much was was regained-->
      {#if $document.flags.titan.chatContext.damageApplied.confirmed === true}
         <div class="section">
            <i class="fas fa-burst" />
            <div>
               {localize('took%xDamage').replace(
                  '%x',
                  chatContext.damageApplied.total
               )}
            </div>
         </div>
      {:else if $document.flags.titan.chatContext.damageApplied.confirmed === false}
         <div class="button">
            <ReportConfirmApplyDamageButton />
         </div>
      {/if}
   {/if}

   <!--Remove Expired Effects Button-->
   {#if $document.flags.titan.chatContext.expiredEffectsRemoved === false}
      <div class="button">
         <ReportRemoveExpiredEffectsButton />
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

      .tag {
         margin-top: 0.5rem;
      }

      .section {
         @include flex-row;
         @include flex-group-center;
         margin-top: 0.5rem;
         flex-wrap: wrap;
         padding-bottom: 0.5rem;

         &:not(:last-child) {
            @include border-bottom;
         }

         .fas {
            margin-right: 0.25rem;
         }
      }

      .message {
         @include panel-1;
         @include border;
         margin-top: 0.5rem;
         padding: 0.25rem;
         width: 100%;
      }

      .button {
         @include flex-row;
         @include flex-group-center;
         width: 100%;
         margin-top: 0.5rem;
      }
   }
</style>
