<script>
   import { getContext } from 'svelte';

   /** @type {object} The embedded document bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');
</script>

<img class="item-image" src={document.data?.img} alt="item"/>

<style lang="scss">
   .item-image {
      width: 32px;
      border: none;
   }
</style>
