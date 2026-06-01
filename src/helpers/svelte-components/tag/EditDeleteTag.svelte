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
    * @property {string} [testId] - Optional test identifier bound to `data-testid` on the root element.
    */

   /** @type {EditDeleteTagProps} */
   let {
      deleteFunction = void 0,
      editFunction = void 0,
      label = void 0,
      labelTooltip = void 0,
      deleteTooltip = void 0,
      editTooltip = void 0,
      testId = void 0,
   } = $props();
</script>

<div class="tag" data-testid={testId}>
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
         transition: text-shadow 0.2s ease;

         // Restore the hover highlight the icons had as anchors (Foundry's default link glow), now lost
         // because they are <button>s. text-shadow is inherited, so the inner <i> glyph glows on hover.
         &:hover {
            text-shadow: 0 0 8px var(--color-shadow-primary, currentColor);
         }
      }
   }
</style>
