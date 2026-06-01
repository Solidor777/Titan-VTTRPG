import Button from '~/helpers/svelte-components/button/Button.svelte';
import Label from '~/helpers/svelte-components/label/Label.svelte';
import TextLabel from '~/helpers/svelte-components/label/TextLabel.svelte';
import IconLabel from '~/helpers/svelte-components/label/IconLabel.svelte';
import ModifiableStatValueLabel from '~/helpers/svelte-components/label/ModifiableStatValueLabel.svelte';
import ModifiedValueLabel from '~/helpers/svelte-components/label/ModifiedValueLabel.svelte';
import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';
import NumberInput from '~/helpers/svelte-components/input/NumberInput.svelte';
import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
import CheckboxInput from '~/helpers/svelte-components/input/CheckboxInput.svelte';
import Select from '~/helpers/svelte-components/input/select/Select.svelte';
import LabelTag from '~/helpers/svelte-components/tag/LabelTag.svelte';
import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
import IconTag from '~/helpers/svelte-components/tag/IconTag.svelte';
import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
import ValueTag from '~/helpers/svelte-components/tag/ValueTag.svelte';
import RarityTag from '~/helpers/svelte-components/tag/RarityTag.svelte';
import DurationTag from '~/helpers/svelte-components/tag/DurationTag.svelte';
import AttributeTag from '~/helpers/svelte-components/tag/AttributeTag.svelte';
import AttributeCheckTag from '~/helpers/svelte-components/tag/AttributeCheckTag.svelte';
import OpposedCheckTag from '~/helpers/svelte-components/tag/OpposedCheckTag.svelte';
import ResistanceTag from '~/helpers/svelte-components/tag/ResistanceTag.svelte';
import ResistedByTag from '~/helpers/svelte-components/tag/ResistedByTag.svelte';
import TraitTag from '~/helpers/svelte-components/tag/TraitTag.svelte';
import SpellAspectTag from '~/helpers/svelte-components/tag/SpellAspectTag.svelte';
import SpellAspectTags from '~/helpers/svelte-components/tag/SpellAspectTags.svelte';
import SpellCustomAspectTag from '~/helpers/svelte-components/tag/SpellCustomAspectTag.svelte';
import EditDeleteTag from '~/helpers/svelte-components/tag/EditDeleteTag.svelte';
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
   Label,
   TextLabel,
   IconLabel,
   ModifiableStatValueLabel,
   ModifiedValueLabel,
   TextInput,
   NumberInput,
   IntegerInput,
   CheckboxInput,
   Select,
   LabelTag,
   Tag,
   IconTag,
   IconStatTag,
   StatTag,
   ValueTag,
   RarityTag,
   DurationTag,
   AttributeTag,
   AttributeCheckTag,
   OpposedCheckTag,
   ResistanceTag,
   ResistedByTag,
   TraitTag,
   SpellAspectTag,
   SpellAspectTags,
   SpellCustomAspectTag,
   EditDeleteTag,
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
