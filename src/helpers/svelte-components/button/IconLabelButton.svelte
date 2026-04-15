<script>
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import IconLabel from '~/helpers/svelte-components/label/IconLabel.svelte';

   /** @type {string} The text label to display for this element. */
   export let label = void 0;

   /** @type {string} The Icon to display for this element. */
   export let icon = void 0;

   /** @type {boolean} Whether the input should currently be disabled. */
   export let disabled = false;

   /**
    * @type {string | TooltipAction}
    * The Tooltip to display for this element, if any.
    */
   export let tooltip = void 0;
</script>

<Button
   {disabled}
   on:click
   {tooltip}
>
   <IconLabel
      {icon}
      {label}
   />
</Button>

