<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import { DELETE_ICON, EDIT_ICON } from '~/system/Icons.js';
   import localize from '~/helpers/utility-functions/Localize.js';

   /**
    * @typedef {object} EditDeleteTagProps
    * @property {Function} [deleteFunction] - Callback for when the Delete button is clicked.
    * @property {Function} [editFunction] - Callback for when the Edit button is clicked.
    * @property {string} [label] - The text to display for this element.
    * @property {string} [labelTooltip] - The tooltip to display when the Label is hovered.
    * @property {string} [deleteTooltip] - The tooltip to display when the Delete Icon is hovered.
    * @property {string} [editTooltip] - The tooltip to display when the Edit Icon is hovered.
    */

   /** @type {EditDeleteTagProps} */
   let {
      deleteFunction = undefined,
      editFunction = undefined,
      label = undefined,
      labelTooltip = undefined,
      deleteTooltip = undefined,
      editTooltip = undefined,
   } = $props();
</script>

<div class="tag">
   <!--Edit Icon-->
   <button
      type="button"
      aria-label={localize('edit')}
      class={EDIT_ICON}
      onclick={() => {
         editFunction();
      }}
      use:tooltipAction={editTooltip}
   ></button>

   <!--Label-->
   <div use:tooltipAction={labelTooltip}>
      {label}
   </div>

   <!--Delete Icon-->
   <button
      type="button"
      aria-label={localize('delete')}
      class={DELETE_ICON}
      onclick={() => {
         deleteFunction();
      }}
      use:tooltipAction={deleteTooltip}
   ></button>
</div>

<style lang="scss">
   .tag {
      @include tag;

      :not(:first-child) {
         @include separator-left;
      }

      // Reset native button chrome so the icon buttons render identically to the previous anchors.
      // font-family and font-weight are intentionally NOT reset so the FontAwesome glyph class
      // keeps its own font and its required 900 weight for solid glyphs.
      button {
         appearance: none;
         background: none;
         border: none;
         margin: 0;
         padding: 0;
         color: inherit;
         font-size: inherit;
         line-height: inherit;
         cursor: pointer;
      }
   }
</style>
