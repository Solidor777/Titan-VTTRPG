<script>
   import Label from '~/helpers/svelte-components/label/Label.svelte';
   import Text from '~/helpers/svelte-components/Text.svelte';

   /** @type {string|TextData} - The text label to display for this element. */
   export let label = void 0;

   /** @type {string|TooltipAction} - The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<Label {tooltip}>
   <div class="text">
      <Text text={label}/>
   </div>
</Label>
