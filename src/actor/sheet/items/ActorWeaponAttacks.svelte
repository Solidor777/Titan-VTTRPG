<script>
   import ActorWeaponAttack from "./ActorWeaponAttack.svelte";

   // Reference to the weapon id
   export let item = void 0;
</script>

<!--Attacks list-->
<ol>
   <!--Each Attack-->
   {#each Object.entries(item.system.attack) as [attackIdx]}
      <li>
         <ActorWeaponAttack {attackIdx} {item} />
      </li>
   {/each}
</ol>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   ol {
      @include flex-row;
      @include flex-group-left;
      @include border;
      margin: 0;
      padding: 0.5rem;
      list-style: none;
      flex-wrap: wrap;
      background-color: var(--label-background-color);

      li {
         width: 100%;

         &:not(:first-child) {
            margin-top: 0.5rem;
         }
      }
   }
</style>
