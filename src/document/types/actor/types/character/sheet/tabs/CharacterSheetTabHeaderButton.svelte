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
      --titan-button-font-size: var(--titan-font-size-small);
      --titan-button-padding: var(--titan-padding-standard);
      --titan-button-line-height: normal;
      --titan-button-border-radius: var(--titan-button-chat-message-border-radius);

      .label {
         @include flex-row;
         @include flex-group-center;

         i {
            margin-right: var(--titan-padding-standard);
         }
      }
   }
</style>
