<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import IconLabel from '~/helpers/svelte-components/label/IconLabel.svelte';
   import TextLabel from '~/helpers/svelte-components/label/TextLabel.svelte';

   /**
    * @typedef {object} LabeledElementProps
    * @property {string} [label] - Label to display.
    * @property {string} [icon] - Optional icon to display.
    * @property {string | import('~/helpers/svelte-actions/TooltipAction.js').TooltipAction} [tooltip] - The tooltip to display for this element, if any.
    * @property {import('svelte').Snippet} [children] - Content to render inside the element area.
    * @property {string} [testId] - Optional test identifier bound to the root element.
    */

   /** @type {LabeledElementProps} */
   let {
      label = undefined,
      icon = undefined,
      tooltip = undefined,
      children,
      testId = void 0,
   } = $props();
</script>

<div
   class="labeled-element"
   data-testid={testId}
   use:tooltipAction={tooltip}
>
   <!--Label-->
   <div class="label">
      {#if icon}
         <IconLabel
            {icon}
            {label}
         />
      {:else}
         <TextLabel {label}/>
      {/if}
   </div>

   <!--Element-->
   <div class="element">
      {@render children?.()}
   </div>
</div>


<style lang="scss">
   .labeled-element {
      @include flex-row;
      @include flex-group-left;

      .element {
         flex-grow: 1;

         @include margin-left-standard;
      }
   }
</style>
