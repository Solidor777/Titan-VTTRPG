<script>
   import Label from '~/helpers/svelte-components/label/Label.svelte';
   import Text from '~/helpers/svelte-components/Text.svelte';

   /**
    * @typedef {object} TextLabelProps
    * @property {string | TextData} [label] - The text label to display for this element.
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this element, if any.
    * @property {string | undefined} [testId] - Optional data-testid forwarded to the Label root for automated probing.
    */

   /** @type {TextLabelProps} */
   let { label = void 0, tooltip = void 0, testId = void 0 } = $props();
</script>

<Label
   {tooltip}
   {testId}
>
   <div class="text">
      <Text text={label}/>
   </div>
</Label>
