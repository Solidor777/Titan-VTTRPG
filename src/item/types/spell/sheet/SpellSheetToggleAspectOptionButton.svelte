<script>
   import { getContext } from 'svelte';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';

   export let enabled = void 0;
   export let label = void 0;

   // Setup
   const document = getContext('DocumentStore');

   // Copy of the document data
   let data;
   $: {
      data = {
         img: $document.img,
         system: $document.system,
         flags: $document.flags,
         name: $document.name,
      };
   }
</script>

<div class="toggle enabled-{enabled === true}">
   <EfxButton
      on:click={() => {
         enabled = !enabled;
         $document.update(data);
      }}
   >
      <div class="label">
         {label}
      </div>
   </EfxButton>
</div>

<style lang="scss">
   @import '../../../../Styles/Mixins.scss';

   .toggle {
      --button-font-size: var(--font-size-small);
      --button-padding: 0 0.25rem;
      --button-border-radius: 10px;
      margin: 0.25rem;

      &.enabled-true {
         --button-background: var(--active-background);
      }

      .label {
         @include flex-row;
         @include flex-group-center;
      }
   }
</style>
