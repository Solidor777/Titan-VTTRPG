import Button from '~/helpers/svelte-components/button/Button.svelte';
import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';
import NumberInput from '~/helpers/svelte-components/input/NumberInput.svelte';
import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
import CheckboxInput from '~/helpers/svelte-components/input/CheckboxInput.svelte';
import Select from '~/helpers/svelte-components/input/select/Select.svelte';
import LabelTag from '~/helpers/svelte-components/tag/LabelTag.svelte';
import RichText from '~/helpers/svelte-components/RichText.svelte';
import FiltereedList from '~/helpers/svelte-components/FiltereedList.svelte';
import CondensedCheckButton from '~/helpers/svelte-components/button/CondensedCheckButton.svelte';
import ProseMirrorEditor from '~/helpers/svelte-components/editor/ProseMirrorEditor.svelte';
import EffectTag from '~/helpers/svelte-components/tag/effects/EffectTag.svelte';
import CustomEffectTag from '~/helpers/svelte-components/tag/effects/CustomEffectTag.svelte';
import ExpiredEffectTag from '~/helpers/svelte-components/tag/effects/ExpiredEffectTag.svelte';
import InitiativeEffectTag from '~/helpers/svelte-components/tag/effects/InitiativeEffectTag.svelte';
import PermanentEffectTag from '~/helpers/svelte-components/tag/effects/PermanentEffectTag.svelte';
import TurnEndEffectTag from '~/helpers/svelte-components/tag/effects/TurnEndEffectTag.svelte';
import TurnStartEffectTag from '~/helpers/svelte-components/tag/effects/TurnStartEffectTag.svelte';

/**
 * Registry of base primitives the test probe can mount in isolation. Keyed by the name passed to
 * `game.titan._probe.mount`. Extended one entry at a time as the probe coverage grows.
 * @type {Record<string, import('svelte').Component>}
 */
const componentRegistry = {
   Button,
   TextInput,
   NumberInput,
   IntegerInput,
   CheckboxInput,
   Select,
   LabelTag,
   RichText,
   FiltereedList,
   CondensedCheckButton,
   ProseMirrorEditor,
   EffectTag,
   CustomEffectTag,
   ExpiredEffectTag,
   InitiativeEffectTag,
   PermanentEffectTag,
   TurnEndEffectTag,
   TurnStartEffectTag,
};

export default componentRegistry;
