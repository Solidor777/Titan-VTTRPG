<script>
   import Button from '~/helpers/svelte-components/button/Button.svelte';

   export let label = void 0;
   export let icon = void 0;
   export let disabled = void 0;
</script>

<div class="button">
   <Button {disabled} on:click>
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
      @include mini-button;

      .label {
         @include flex-row;
         @include flex-group-center;

         i {
            margin-right: var(--titan-padding-standard);
         }
      }
   }
</style>
