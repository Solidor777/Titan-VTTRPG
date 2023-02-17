<script>
   import { getContext } from 'svelte';
   import { localize } from '~/helpers/utility';
   import ChatResource from '~/chat-message/ChatResource.svelte';
   import ReportHeader from '~/chat-message/report/components/ReportHeader.svelte';

   // Document reference
   const document = getContext('DocumentStore');
   const chatContext = $document.flags.titan.chatContext;
</script>

<div class="report">
   <!--Header-->
   <ReportHeader
      icon={'fas fa-bolt'}
      label={localize('spent%xResolve').replace('%x', chatContext.resolveSpent)}
   />

   <!--Resolve-->
   <div class="message">
      <ChatResource
         icon={'fas fa-bolt'}
         label={localize('resolve')}
         value={chatContext.resolve.value}
         max={chatContext.resolve.max}
      />
   </div>
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
