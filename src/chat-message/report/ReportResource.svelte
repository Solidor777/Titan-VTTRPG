<script>
   export let max = void 0;
   export let value = void 0;
   export let icon = void 0;
   export let label = void 0;
</script>

<div class="message">
   <i class={icon} />
   <div>
      {`${label}: ${$document.flags.titan.chatContext.stamina.value} / ${$document.flags.titan.chatContext.stamina.max}`}
   </div>
</div>

<style lang="scss">
   @import '../../styles/Mixins.scss';

   .message {
      @include flex-row;
      @include flex-group-center;
      margin-top: 0.25rem;
      flex-wrap: wrap;

      &:not(:last-child) {
         @include border-bottom;
         padding-bottom: 0.25rem;
      }

      i {
         margin-right: 0.25rem;
      }
   }
</style>
