<script>
   import Button from '~/helpers/svelte-components/button/Button.svelte';

   export let enabled = void 0;
   export let label = void 0;
   export let disabled = false;
</script>

<div class="toggle enabled-{enabled === true}">
   <Button on:click {disabled}>
      <div class="label">
         {label}
      </div>
   </Button>
</div>

<style lang="scss">
   .toggle {
      --button-font-size: var(--font-size-small);
      --button-padding: var(--padding-standard);
      --button-line-height: normal;
      --button-border-radius: var(--button-chat-message-border-radius);

      &.enabled-true {
         --button-background: var(--active-background);
      }

      .label {
         @include flex-row;
         @include flex-group-center;
      }
   }
</style>
