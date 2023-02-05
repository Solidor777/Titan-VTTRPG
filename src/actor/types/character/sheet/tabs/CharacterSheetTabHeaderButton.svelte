<script>
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';
   export let label = void 0;
   export let icon = void 0;
</script>

<div class="button">
   <EfxButton on:click>
      <div class="label">
         {#if icon}
            <i class={`fas fa-${icon}`} />
         {/if}
         <div>
            {label}
         </div>
      </div>
   </EfxButton>
</div>

<style lang="scss">
   @import '../../../../../Styles/Mixins.scss';

   .button {
      --button-font-size: var(--font-size-small);
      --button-padding: 0.25rem;
      --button-line-height: normal;
      --button-border-radius: 10px;

      .label {
         @include flex-row;
         @include flex-group-center;

         i {
            margin-right: 0.25rem;
         }
      }
   }
</style>
