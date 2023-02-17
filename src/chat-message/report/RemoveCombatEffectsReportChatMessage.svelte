<script>
   import { localize } from '~/helpers/utility';
   import ReportHeader from './components/ReportHeader.svelte';
</script>

<div class="report">
   <!--Header-->
   <ReportHeader
      icon={'fas fa-arrow-rotate-left'}
      label={localize('combatEffectsRemoved')}
   />

   <!--Resolve restored-->
   <div class="message">
      <i class="fas fa-bolt" />
      <div>{localize('resolveFullyRestored')}</div>
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

         i {
            margin-right: 0.25rem;
         }

         &:not(:last-child) {
            @include border-bottom;
         }
      }
   }
</style>
