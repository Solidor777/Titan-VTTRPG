<script>
   import { localize } from '~/helpers/utility';

   export let resolveRegained = void 0;
   export let resolveValue = void 0;
   export let resolveMax = void 0;
</script>

<div class="messages">
   <div class="message">
      <i class="fas fa-bolt" />
      <div>{localize('regainedResolve')} ({resolveRegained})</div>
   </div>
   <div class="message">
      {localize('resolve')}
      {resolveValue} / {resolveMax}
   </div>
</div>

<style lang="scss">
   @import '../styles/Mixins.scss';

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
</style>
