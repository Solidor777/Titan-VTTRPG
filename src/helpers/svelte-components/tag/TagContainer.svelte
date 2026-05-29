<script>
   import { slide } from 'svelte/transition';

   /**
    * @typedef {object} Tag
    * Object used to store data for a Tag.
    * @property {*} id - Identifier to use for ordering the tags.
    * @property {import('svelte').Component} component - Component to use for this tag.
    * @property {object} props - Props to use with the component.
    */

   /**
    * @typedef {object} TagContainerProps
    * @property {Tag[]} [tags] - List of tags to place in the container.
    */

   /** @type {TagContainerProps} */
   let { tags = undefined } = $props();
</script>

<!--Tag Container-->
<div class="tag-container">
   <!--Each Tag-->
   {#each tags as tag (tag.id)}
      {@const TagComponent = tag.component}
      <div class="tag" transition:slide>
         <!--Tag Component-->
         <TagComponent {...tag.props}/>
      </div>
   {/each}
</div>

<style lang="scss">
   .tag-container {
      @include tag-container;
   }
</style>
