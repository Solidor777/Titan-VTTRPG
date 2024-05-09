<script>

   /** @type string The message to display. */
   export let message = void 0;

   /** @type string The icon to display next to the message. */
   export let icon = void 0;
</script>

<div class="message">
   <i class="{icon}"/>
   <div>{message}</div>
</div>

<style lang="scss">
   .message {
      @include flex-row;
      @include flex-group-center;

      width: 100%;

      i {
         margin-right: var(--padding-standard);
      }
   }
</style>
