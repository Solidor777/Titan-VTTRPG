<script>
   /**
    * @typedef {object} CheckChatMessageItemHeaderProps
    * @property {string} [attribute] - The attribute key, used for attribute coloring CSS class.
    * @property {string} [img] - The item image URL.
    * @property {import('svelte').Snippet} [children] - Content to render inside the labels area.
    */

   /** @type {CheckChatMessageItemHeaderProps} */
   let {
      attribute = undefined,
      img = undefined,
      children,
   } = $props();
</script>

<div class="label">
   <div class="content {attribute}">
      <!--Item image (omitted when the document has none; an empty src is an invalid media URI)-->
      {#if img}
         <img
            alt="item"
            class={img.indexOf('.svg') === -1 ? '' : 'svg'}
            src={img}
         />
      {/if}

      <!--Labels-->
      <div class="labels">
         {@render children?.()}
      </div>
   </div>
</div>

<style lang="scss">
   .label {
      @include flex-row;
      @include flex-group-center;

      width: 100%;

      .content {
         @include flex-row;
         @include flex-group-center;
         @include attribute-colors;
         @include border;
         @include tag;
         @include padding-large;

         font-weight: bold;

         img {
            width: 32px;
            border: none;

            @include margin-right-standard;
         }

         .labels {
            @include flex-column;
            @include flex-group-top-left;
         }
      }
   }
</style>
