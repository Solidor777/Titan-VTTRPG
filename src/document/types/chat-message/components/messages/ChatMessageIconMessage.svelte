<script>
   /**
    * @typedef {object} ChatMessageIconMessageProps
    * @property {string} [message] The message to display.
    * @property {string} [icon] The icon class to display next to the message.
    */

   /** @type {ChatMessageIconMessageProps} */
   const { message = void 0, icon = void 0 } = $props();
</script>

<div class="message">
   <i class={icon}/>
   <div>{message}</div>
</div>

<style lang="scss">
   .message {
      @include flex-row;
      @include flex-group-center;

      width: 100%;

      i {
         @include margin-right-standard;
      }
   }
</style>
