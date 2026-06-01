<script>
   import Label from '~/helpers/svelte-components/label/Label.svelte';
   import Text from '~/helpers/svelte-components/Text.svelte';

   /**
    * @typedef {object} IconLabelProps
    * @property {string | TextData} [label] - The text label to display for this element.
    * @property {string} [icon] - The icon class to display for this element.
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this element, if any.
    * @property {string | undefined} [testId] - Optional data-testid forwarded to the Label root for automated probing.
    */

   /** @type {IconLabelProps} */
   let { label = void 0, icon = void 0, tooltip = void 0, testId = void 0 } = $props();
</script>

<Label {tooltip} {testId}>
   <!--Icon-->
   <i class={icon}></i>

   <!--Text-->
   <div class="text">
      <Text text={label}/>
   </div>
</Label>

<style lang="scss">
   i {
      @include margin-right-standard;
   }
</style>
