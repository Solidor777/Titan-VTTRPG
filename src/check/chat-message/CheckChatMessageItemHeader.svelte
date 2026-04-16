<script>
   /** @type {string} The attribute key, used for attribute coloring CSS class. */
   export let attribute = void 0;

   /** @type {string} The item image URL. */
   export let img = void 0;
</script>

<div class="label">
   <div class="content {attribute}">
      <img
         alt="item"
         class={img.indexOf('.svg') === -1 ? '' : 'svg'}
         src={img}
      />

      <!--Labels-->
      <div class="labels">
         <slot />
      </div>
   </div>
</div>

<style lang="scss">
   .label {
      @include flex-row;
      @include flex-group-left;

      width: 100%;

      .content {
         @include flex-row;
         @include flex-group-left;
         @include attribute-colors;
         @include border;
         @include tag;
         @include padding-large;

         font-weight: bold;

         img {
            width: 32px;
            border: none;
            margin-right: var(--titan-spacing-standard);
         }

         .labels {
            @include flex-column;
            @include flex-group-top-left;

            :global(.label) {
               @include flex-row;
               @include font-size-large;
            }

            :global(.sub-label) {
               @include flex-row;
               @include font-size-small;
            }
         }
      }
   }
</style>
