<script>
   import Button from '~/helpers/svelte-components/button/Button.svelte';

   /** @type boolean Whether this Option is currently enabled. */
   export let enabled = void 0;

   /** @type boolean The label to display for the option. */
   export let label = void 0;

   /** @type boolean Whether the button should currently be disabled. */
   export let disabled = false;

   /** @type string The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<div class="toggle enabled-{enabled === true}">
   <Button {disabled} on:click {tooltip}>
      {label}
   </Button>
</div>

<style lang="scss">
   .toggle {
      @include mini-button;

      &.enabled-true {
         --titan-button-background: var(--titan-active-background);
      }
   }
</style>
