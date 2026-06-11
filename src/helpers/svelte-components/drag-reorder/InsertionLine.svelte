<!--The glowing accent bar marking where a dragged row will land.-->
<div class="insertion-line" aria-hidden="true"></div>

<style lang="scss">
   .insertion-line {
      position: relative;

      width: 100%;
      height: 0;

      &::before {
         content: '';

         position: absolute;
         top: -2px;
         right: 0;
         left: 0;

         height: 3px;

         border-radius: 2px;
         background: var(--titan-highlighted-font-color);
         box-shadow: 0 0 6px 1px var(--titan-highlighted-font-color);
      }
   }
</style>
