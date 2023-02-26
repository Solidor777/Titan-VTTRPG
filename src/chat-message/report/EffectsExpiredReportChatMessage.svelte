<script>
   import { getContext } from 'svelte';
   import { localize } from '~/helpers/utility';
   import ChatEffects from '~/chat-message/ChatEffects.svelte';
   import ReportRemoveExpiredEffectsButton from '~/chat-message/report/components/ReportRemoveExpiredEffectsButton.svelte';
   import ReportHeader from '~/chat-message/report/components/ReportHeader.svelte';

   // Document reference
   const document = getContext('DocumentStore');
</script>

<div class="report">
   <!--Header-->
   <ReportHeader icon={'fas fa-clock'} label={localize('effectsExpired')} />

   <!--Effects-->
   <ChatEffects />

   <!--Remove Expired Effects Button-->
   {#if $document.flags.titan.expiredEffectsRemoved === false}
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

      .button {
         @include flex-row;
         @include flex-group-center;
         width: 100%;
         margin-top: 0.5rem;
      }
   }
</style>
