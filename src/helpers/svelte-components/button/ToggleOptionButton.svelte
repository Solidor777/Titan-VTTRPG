<script>
   import Button from '~/helpers/svelte-components/button/Button.svelte';

   export let enabled = void 0;
   export let label = void 0;
   export let disabled = false;
</script>

<div class="toggle enabled-{enabled === true}">
   <Button {disabled} on:click>
      <div class="label">
         {label}
      </div>
   </Button>
</div>

<style lang="scss">
   .toggle {
      --titan-button-font-size: var(--titan-font-size-small);
      --titan-button-padding: var(--titan-padding-standard);
      --titan-button-line-height: normal;
      --titan-button-border-radius: var(--titan-button-chat-message-border-radius);

      &.enabled-true {
         --titan-button-background: var(--titan-active-background);
      }

      .label {
         @include flex-row;
         @include flex-group-center;
      }
   }
</style>
