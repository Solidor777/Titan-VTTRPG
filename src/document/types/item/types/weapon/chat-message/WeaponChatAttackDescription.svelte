<script>
   import {getContext} from 'svelte';

   const document = getContext('document');

   // Chat context reference
   const titanFlags = $document.flags.titan;
</script>

<div class="description">Temporary Attack Notes</div>

<style lang="scss">
   .description {
      @include flex-row;
      @include flex-group-left;

      padding: 0 var(--titan-padding-large) 0 var(--titan-padding-large);

      @include font-size-normal;

      width: 100%;
   }
</style>
