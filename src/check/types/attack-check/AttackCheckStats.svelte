<script>
   import { localize } from "~/helpers/Utility.js";
   import IconStatTag from "~/helpers/svelte-components/tag/IconStatTag.svelte";
   import IconTag from "~/helpers/svelte-components/tag/IconTag.svelte";
   import StatTag from "~/helpers/svelte-components/tag/StatTag.svelte";
   import Tag from "~/helpers/svelte-components/tag/Tag.svelte";

   export let attack = void 0;
</script>

<div class="stats">
   <!--Type-->
   <div class="stat">
      <IconTag icon={attack.type === "melee" ? "fas fa-sword" : "fas fa-bow-arrow"} label={localize(attack.type)} />
   </div>

   <!--Range-->
   {#if attack.range !== 1}
      <div class="stat">
         <IconStatTag label={localize("range")} value={attack.range} icon={"fas fa-ruler"} />
      </div>
   {/if}

   <!--Traits-->
   {#each attack.trait as trait}
      <div class="stat" data-tooltip={localize(`${trait.name}.desc`)}>
         {#if trait.type === "number"}
            <StatTag label={localize(`${trait.name}`)} value={trait.value} />
         {:else}
            <Tag label={localize(`${trait.name}`)} />
         {/if}
      </div>
   {/each}
</div>

<style lang="scss">
   @import "../../../styles/mixins.scss";
   .stats {
      @include flex-row;
      @include flex-group-center;
      width: 100%;
      flex-wrap: wrap;

      .stat {
         @include tag-margin;
      }
   }
</style>
