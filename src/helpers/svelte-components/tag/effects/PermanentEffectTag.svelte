<script>
   import {PERMANENT_ICON} from '~/system/Icons.js';
   import EffectTag from '~/helpers/svelte-components/tag/effects/EffectTag.svelte';

   /**@type PermanentEffectData Data for this tag's Effect. */
   export let effect = void 0;

</script>

<div class="tag">
   <EffectTag {effect} icon={PERMANENT_ICON}/>
</div>

<style lang="scss">
   .tag {
      --titan-tag-background: linear-gradient(
            var(--titan-gradient-degree), var(--titan-permanent-effect-primary), var(--titan-permanent-effect-secondary) 100%
      );
   }
</style>