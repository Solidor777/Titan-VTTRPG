<script>
   import { getContext } from 'svelte';
   const document = getContext('DocumentStore');

   // Chat context reference
   const chatContext = $document.flags.titan;
</script>

<div class="description">Temporary Attack Notes</div>

<style lang="scss">
   @import '../../../../styles/mixins.scss';
   .description {
      @include flex-row;
      @include flex-group-left;
      padding: 0 0.5rem 0 0.5rem;
      @include font-size-normal;
      width: 100%;
   }
</style>
