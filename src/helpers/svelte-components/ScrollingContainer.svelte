<script>
   let scrollClass = '';

   export let scrollTop = 0;

   /**
    * @param event
    */
   function onScroll(event) {
      scrollTop = event.target.scrollTop;

      const node = event.target;
      const isScrollable = node.scrollHeight > node.clientHeight;

      // If element is not scrollable, remove all classes
      if (!isScrollable) {
         node.classList.remove('is-bottom-overflowing', 'is-top-overflowing');
         return;
      }

      // Find out which direction it is overflowing to
      const isScrolledToBottom = node.scrollHeight <= node.clientHeight + node.scrollTop + 12;

      //
      const isScrolledToTop = node.scrollTop === 0;
      if (!isScrolledToBottom) {
         scrollClass = ' faded bottom-overflowing';
         if (!isScrolledToTop) {
            scrollClass += ' top-overflowing';
         }
      } else if (!isScrolledToTop) {
         scrollClass = ' faded top-overflowing';
      } else {
         scrollClass = '';
      }
   }

   /**
    * @param node
    */
   function initialScroll(node) {
      node.scrollTop = scrollTop;

      const isScrollable = node.scrollHeight > node.clientHeight;

      if (isScrollable) {
         // Find out which direction it is overflowing to
         const isScrolledToBottom = node.scrollHeight <= node.clientHeight + node.scrollTop + 12;

         //
         const isScrolledToTop = node.scrollTop === 0;
         if (!isScrolledToBottom) {
            scrollClass = ' faded bottom-overflowing';
            if (!isScrolledToTop) {
               scrollClass += ' top-overflowing';
            }
         } else if (!isScrolledToTop) {
            scrollClass = ' faded top-overflowing';
         } else {
            scrollClass = '';
         }
      }
   }
</script>

<div class="container">
   <div class="content{scrollClass}" on:scroll={onScroll} use:initialScroll>
      <slot>Scrolling Content</slot>
   </div>
</div>

<style lang="scss">
   .container {
      @include flex-column;

      position: relative;
      width: 100%;
      height: 100%;

      .content {
         @include flex-column;

         width: 100%;
         height: 100%;
         position: absolute;
         overflow-y: scroll;
         padding: 0 8px 0 0;

         --top-mask-size: 0px;
         --bottom-mask-size: 0px;

         &.top-overflowing {
            --top-mask-size: 12px;
         }

         &.bottom-overflowing {
            --bottom-mask-size: 12px;
         }

         &.faded {
            mask-image: linear-gradient(
                  to bottom,
                  transparent 0,
                  black var(--top-mask-size, 0),
                  black calc(100% - var(--bottom-mask-size, 0)),
                  transparent 100%
            );
         }
      }
   }
</style>
