<script>
   import {getContext} from 'svelte';
   import Button from '~/helpers/svelte-components/button/Button.svelte';

   export let enabled = void 0;
   export let label = void 0;

   /** @type object Reference to the Document store. */
   const document = getContext('document');

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
   <Button
      on:click={() => {
         if ($document?.isOwner) {
            enabled = !enabled;
            $document.update(data);
         }
      }}
   >
      <div class="label">
         {label}
      </div>
   </Button>
</div>

<style lang="scss">
   .toggle {
      --titan-button-font-size: var(--titan-font-size-small);
      --titan-button-padding: 0 var(--titan-padding-standard);
      --titan-button-border-radius: var(--titan-button-chat-message-border-radius);

      margin: var(--titan-padding-standard);

      &.enabled-true {
         --titan-button-background: var(--titan-active-background);
      }

      .label {
         @include flex-row;
         @include flex-group-center;
      }
   }
</style>
