<script>
   import {EXPIRED_ICON} from '~/system/Icons.js';
   import EffectTag from '~/helpers/svelte-components/tag/effects/EffectTag.svelte';

   /**@type ExpiredEffectData Data for this tag's Effect. */
   export let effect = void 0;

</script>

<div class="tag">
   <EffectTag {effect} icon={EXPIRED_ICON}/>
</div>

<style lang="scss">
   .tag {
      --titan-tag-background: linear-gradient(
            var(--titan-gradient-degree), var(--titan-expired-effect-primary), var(--titan-expired-effect-secondary) 100%
      );
   }
</style>