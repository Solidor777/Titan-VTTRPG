<script>
   /**
    * @typedef {object} ItemChatFooterProps
    * @property {import('svelte').Snippet} [children] - Content to render inside the footer.
    */

   /** @type {ItemChatFooterProps} */
   const { children } = $props();
</script>

<div class="footer">
   {@render children?.()}
</div>

<style lang="scss">
   .footer {
      @include flex-row;
      @include flex-space-evenly;

      flex-wrap: wrap;
      width: 100%;
      padding: 0 var(--titan-spacing-large) 0 var(--titan-spacing-large);

      @include font-size-small;
   }
</style>
