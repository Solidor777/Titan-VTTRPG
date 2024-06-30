<script>
   import isChromium from '~/helpers/utility-functions/IsChromium.js';

   /** @type number Initial scroll top of this container. */
   export let scrollTop = 0;

   /** @type string Computed class for affect the display of the scrolling container. */
   let scrollClass = '';

   /**
    * @type number The length of the scroll fade in pixels, if any. Excluded from Chromium because it causes the entire
    * element to be blurred on Chromium browsers.
    */
   const fadeLength = isChromium() ? 0 : 12;

   /**
    * Called when the element is scrolled.
    * @param {DOM Event} event - The DOM Event of the scroll input.
    */
   function onScroll(event) {

      // Update the scroll top state variable.
      scrollTop = event.target.scrollTop;

      // Styling code for a blur at the top and bottom of an overflowing element.
      if (fadeLength > 0) {
         const element = event.target;
         updateScrollClass(element);
      }
   }

   /**
    * Initializes the position of the scroll and the scroll classes on the scrollable element.
    * @param {Element} element - The scrollable element.
    */
   function initialScroll(element) {
      // Initialize the element's scroll top.
      element.scrollTop = scrollTop;

      // Styling code for a blur at the top and bottom of an overflowing element.
      if (fadeLength > 0) {
         updateScrollClass(element);
      }
   }

   /**
    * Updates the scroll class depending on whether the top or bottom of the element is overflowing.
    * @param {Element} element - The scrollable element.
    */
   function updateScrollClass(element) {

      // If the element is scrollable, add the faded class
      if (element.scrollHeight > element.clientHeight) {
         scrollClass = ' faded';

         // Update whether the element is overflowing its top.
         if (element.scrollTop > fadeLength) {
            scrollClass += ' top-overflowing';
         }

         // Update whether the element is overflowing its bottom.
         if (element.scrollHeight > element.clientHeight + element.scrollTop + 12) {
            scrollClass += ' bottom-overflowing';
         }
      }

      // If the element is not scrollable, blank out the scroll class
      else {
         scrollClass = '';
      }
   }
</script>

<div class="container">
   <div class="content{scrollClass}" on:scroll={onScroll} use:initialScroll>
      <slot/>
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
         padding: 0;
         will-change: scroll-position;
         overflow: clip scroll;
         scrollbar-gutter: stable;

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
