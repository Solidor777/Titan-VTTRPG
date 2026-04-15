<script>
   import { slide } from 'svelte/transition';

   /**
    * @typedef {object} Tag
    * Object used to store data for a Tag.
    * @property {*} id Identifier to use for ordering the tags.
    * @property {SvelteComponent} component Component to use for this tag.
    * @property {object} props Props to use with the component.
    */

   /** @type {Tag[]} List of tags to place in the container. */
   export let tags = void 0;
</script>
<!--Tag Container-->
<div class="tag-container">
   <!--Each Tag-->
   {#each tags as tag (tag.id)}
      <div class="tag" transition:slide|local>
         <!--Tag Component-->
         <svelte:component this={tag.component} {...tag.props}/>
      </div>
   {/each}
</div>

<style lang="scss">
   .tag-container {
      @include tag-container;
   }
</style>
