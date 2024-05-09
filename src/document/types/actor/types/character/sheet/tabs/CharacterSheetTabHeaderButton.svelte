<script>
   import Button from '~/helpers/svelte-components/button/Button.svelte';

   export let label = void 0;
   export let icon = void 0;
</script>

<div class="button">
   <Button on:click>
      <div class="label">
         {#if icon}
            <i class={icon}/>
         {/if}
         <div>
            {label}
         </div>
      </div>
   </Button>
</div>

<style lang="scss">
   .button {
      --button-font-size: var(--font-size-small);
      --button-padding: var(--padding-standard);
      --button-line-height: normal;
      --button-border-radius: var(--button-chat-message-border-radius);

      .label {
         @include flex-row;
         @include flex-group-center;

         i {
            margin-right: var(--padding-standard);
         }
      }
   }
</style>
