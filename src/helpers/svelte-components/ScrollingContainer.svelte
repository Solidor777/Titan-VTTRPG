<script>

   /** @type number Initial scroll top of this container. */
   export let scrollTop = 0;

   /** @type boolean Whether the container is overflowing its top. */
   let isOverflowingTop = false;

   /** @type boolean Whether the container is overflowing its bottom. */
   let isOverflowingBottom = false;

   /** @type number The length of the scroll fade in pixels, if any. */
   const fadeLength = 12;

   /**
    * Called when the element is scrolled.
    * @param {DOM Event} event - The DOM Event of the scroll input.
    */
   function onScroll(event) {

      // Update the scroll top state variable.
      scrollTop = event.target.scrollTop;

      // Styling code for a blur at the top and bottom of an overflowing element.
      const element = event.target;
      updateOverflowingState(element);
   }

   /**
    * Initializes the position of the scroll and the scroll classes on the scrollable element.
    * @param {Element} element - The scrollable element.
    */
   function initialScroll(element) {
      // Initialize the element's scroll top.
      element.scrollTop = scrollTop;

      // Styling code for a blur at the top and bottom of an overflowing element.
      updateOverflowingState(element);
   }

   /**
    * Updates the scroll class depending on whether the top or bottom of the element is overflowing.
    * @param {Element} element - The scrollable element.
    */
   function updateOverflowingState(element) {
      isOverflowingTop = element.scrollTop > fadeLength;
      isOverflowingBottom = element.scrollHeight > element.clientHeight + element.scrollTop + fadeLength;
   }
</script>

<div class="container">
   <!--Content-->
   <div class="content" on:scroll={onScroll} use:initialScroll>
      <slot/>
   </div>

   <!--Top Overflowing Blur-->
   {#if isOverflowingTop}
      <span class="overflow top"/>
   {/if}

   <!--Bottom Overflowing Blur-->
   {#if isOverflowingBottom}
      <span class="overflow bottom"/>
   {/if}
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
         padding: 0;
         will-change: scroll-position;
         overflow: clip scroll;
         scrollbar-gutter: stable;
      }

      .overflow {
         background: black;
         position: absolute;
         width: 100%;
         height: 12px;
         pointer-events: none;

         &.top {
            background: linear-gradient(
                  to bottom,
                  var(--titan-panel-1-background, 0),
                  transparent,
            );
         }

         &.bottom {
            bottom: 0;
            background: linear-gradient(
                  to top,
                  var(--titan-panel-1-background, 0),
                  transparent,
            );
         }
      }
   }
</style>
