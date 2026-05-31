<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import { DELETE_ICON, EDIT_ICON } from '~/system/Icons.js';
   import localize from '~/helpers/utility-functions/Localize.js';

   /**
    * @typedef {object} EditDeleteTagProps
    * @property {Function} [deleteFunction] - Callback for when the Delete button is clicked.
    * @property {Function} [editFunction] - Callback for when the Edit button is clicked.
    * @property {string} [label] - The text to display for this element.
    * @property {string | object} [labelTooltip] - The tooltip to display when the Label is hovered. May be a
    * plain localization key string, or a TextData object (e.g. `{ text, localize: false }`) for
    * user-authored content that must be shown verbatim.
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
      onclick={() => {
         editFunction();
      }}
      use:tooltipAction={editTooltip}
   >
      <i class={EDIT_ICON}></i>
   </button>

   <!--Label-->
   <div use:tooltipAction={labelTooltip}>
      {label}
   </div>

   <!--Delete Icon-->
   <button
      type="button"
      aria-label={localize('delete')}
      onclick={() => {
         deleteFunction();
      }}
      use:tooltipAction={deleteTooltip}
   >
      <i class={DELETE_ICON}></i>
   </button>
</div>

<style lang="scss">
   .tag {
      @include tag;

      :not(:first-child) {
         @include separator-left;
      }

      // Reset native button chrome so the icon buttons render identically to the previous anchors.
      // The FontAwesome glyph class is placed on an inner <i>, not the <button> itself, so that
      // Foundry's Signika button font-family cannot override the FA font needed for glyph rendering.
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
