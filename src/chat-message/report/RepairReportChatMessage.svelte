<script>
   import { getContext } from 'svelte';
   import { localize } from '~/helpers/utility';
   import ChatResource from '~/chat-message/ChatResource.svelte';
   import ReportDoubleHeader from './components/ReportDoubleHeader.svelte';

   // Document reference
   const document = getContext('DocumentStore');
   const chatContext = $document.flags.titan;
</script>

<div class="report">
   <!--Header-->
   <ReportDoubleHeader
      name1={chatContext.actorName}
      name2={chatContext.itemName}
      img1={chatContext.actorImg}
      img2={chatContext.itemImg}
      icon={'fas fa-burst'}
      label={localize('repaired%xArmor').replace(
         '%x',
         chatContext.armorRepaired
      )}
   />

   <!--Armor-->
   <div class="message">
      <ChatResource
         icon={'fas fa-helmet-battle'}
         label={localize('armor')}
         value={chatContext.armor.value}
         max={chatContext.armor.max}
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
         flex-wrap: wrap;
         padding-bottom: 0.5rem;

         &:not(.tags) {
            margin-top: 0.5rem;
         }

         &:not(:last-child) {
            @include border-bottom;
         }
      }
   }
</style>
