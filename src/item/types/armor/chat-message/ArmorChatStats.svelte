<script>
   import { localize } from "~/helpers/Utility.js";
   import IconStatTag from "~/helpers/svelte-components/tag/IconStatTag.svelte";
   import StatTag from "~/helpers/svelte-components/tag/StatTag.svelte";
   import Tag from "~/helpers/svelte-components/tag/Tag.svelte";

   // Item reference
   export let item = void 0;
</script>

<div class="stats">
   <div class="stat">
      <IconStatTag icon={"fas fa-helmet-battle"} label={localize("armor")} value={item.system.armor} />
   </div>

   <!--Traits-->
   {#each item.system.trait as trait}
      <div class="stat">
         {#if trait.type === "number"}
            <StatTag label={localize(`${trait.name}`)} value={trait.value} />
         {:else}
            <Tag label={localize(`${trait.name}`)} />
         {/if}
      </div>
   {/each}
</div>

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";
   .stats {
      @include flex-row;
      @include flex-group-center;
      @include font-size-small;
      width: 100%;
      flex-wrap: wrap;

      .stat {
         @include tag-padding;
      }
   }
</style>
