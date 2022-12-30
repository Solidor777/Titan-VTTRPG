<script>
   import { localize } from "~/helpers/Utility.js";
   import tooltip from "~/helpers/svelte-actions/Tooltip.js";
   import IconStatTag from "~/helpers/svelte-components/tag/IconStatTag.svelte";
   import StatTag from "~/helpers/svelte-components/tag/StatTag.svelte";
   import Tag from "~/helpers/svelte-components/tag/Tag.svelte";
   import RarityTag from "~/helpers/svelte-components/tag/RarityTag.svelte";
   import ValueTag from "~/helpers/svelte-components/tag/ValueTag.svelte";

   // Item reference
   export let item = void 0;
</script>

<div class="stats">
   <div class="stat" use:tooltip={{ content: localize("defense.desc") }}>
      <IconStatTag icon={"fas fa-shield"} label={localize("defense")} value={item.system.defense} />
   </div>

   <!--Rarity-->
   <div class="stat">
      <RarityTag rarity={item.system.rarity} />
   </div>

   <!--Value-->
   {#if item.system.value}
      <div class="stat">
         <ValueTag value={item.system.value} />
      </div>
   {/if}

   <!--Traits-->
   {#each item.system.trait as trait}
      <div class="stat" use:tooltip={{ content: localize(`${trait.name}.desc`) }}>
         {#if trait.type === "number"}
            <StatTag label={localize(`${trait.name}`)} value={trait.value} />
         {:else}
            <Tag label={localize(`${trait.name}`)} />
         {/if}
      </div>
   {/each}

   <!--Custom Traits-->
   {#each item.system.customTrait as trait}
      <div class="stat" use:tooltip={{ content: trait.description }}>
         <Tag label={trait.name} />
      </div>
   {/each}
</div>

<style lang="scss">
   @import "../../../../../../Styles/Mixins.scss";
   .stats {
      @include flex-row;
      @include flex-group-center;
      @include font-size-small;
      width: 100%;
      flex-wrap: wrap;

      .stat {
         @include tag-margin;
      }
   }
</style>
