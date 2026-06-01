import Meter from '~/helpers/svelte-components/Meter.svelte';
import Text from '~/helpers/svelte-components/Text.svelte';
import Tabs from '~/helpers/svelte-components/Tabs.svelte';
import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
import LabeledElement from '~/helpers/svelte-components/LabeledElement.svelte';
import BorderedColumnList from '~/helpers/svelte-components/BorderedColumnList.svelte';
import TagContainer from '~/helpers/svelte-components/tag/TagContainer.svelte';
import AttributeInput from '~/helpers/svelte-components/input/AttributeInput.svelte';
import Button from '~/helpers/svelte-components/button/Button.svelte';
import ImagePicker from '~/helpers/svelte-components/input/ImagePicker.svelte';
import IntegerIncrementInput from '~/helpers/svelte-components/input/IntegerIncrementInput.svelte';
import LabeledTextInput from '~/helpers/svelte-components/input/LabeledTextInput.svelte';
import RarityInput from '~/helpers/svelte-components/input/RarityInput.svelte';
import ResistanceInput from '~/helpers/svelte-components/input/ResistanceInput.svelte';
import TextAreaInput from '~/helpers/svelte-components/input/TextAreaInput.svelte';
import TopFilter from '~/helpers/svelte-components/input/TopFilter.svelte';
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
import ArmorTraitSelect from '~/helpers/svelte-components/input/select/ArmorTraitSelect.svelte';
import AttackTraitSelect from '~/helpers/svelte-components/input/select/AttackTraitSelect.svelte';
import AttackTypeSelect from '~/helpers/svelte-components/input/select/AttackTypeSelect.svelte';
import AttributeSelect from '~/helpers/svelte-components/input/select/AttributeSelect.svelte';
import CheckDifficultySelect from '~/helpers/svelte-components/input/select/CheckDifficultySelect.svelte';
import DamageReducedBySelect from '~/helpers/svelte-components/input/select/DamageReducedBySelect.svelte';
import InventoryItemTypeSelect from '~/helpers/svelte-components/input/select/InventoryItemTypeSelect.svelte';
import ModSelect from '~/helpers/svelte-components/input/select/ModSelect.svelte';
import RaritySelect from '~/helpers/svelte-components/input/select/RaritySelect.svelte';
import RatingSelect from '~/helpers/svelte-components/input/select/RatingSelect.svelte';
import ResistanceSelect from '~/helpers/svelte-components/input/select/ResistanceSelect.svelte';
import ResourceSelect from '~/helpers/svelte-components/input/select/ResourceSelect.svelte';
import RulesElementOperationSelect from '~/helpers/svelte-components/input/select/RulesElementOperationSelect.svelte';
import ShieldTraitSelect from '~/helpers/svelte-components/input/select/ShieldTraitSelect.svelte';
import SkillSelect from '~/helpers/svelte-components/input/select/SkillSelect.svelte';
import SpeedSelect from '~/helpers/svelte-components/input/select/SpeedSelect.svelte';
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
import AttributeButton from '~/helpers/svelte-components/button/AttributeButton.svelte';
import CondensedCheckButton from '~/helpers/svelte-components/button/CondensedCheckButton.svelte';
import ExpandButton from '~/helpers/svelte-components/button/ExpandButton.svelte';
import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
import IconLabelButton from '~/helpers/svelte-components/button/IconLabelButton.svelte';
import ImageButton from '~/helpers/svelte-components/button/ImageButton.svelte';
import ItemCheckButton from '~/helpers/svelte-components/button/ItemCheckButton.svelte';
import MiniButton from '~/helpers/svelte-components/button/MiniButton.svelte';
import MiniIconButton from '~/helpers/svelte-components/button/MiniIconButton.svelte';
import ResistanceButton from '~/helpers/svelte-components/button/ResistanceButton.svelte';
import ResistanceCheckButton from '~/helpers/svelte-components/button/ResistanceCheckButton.svelte';
import SpendResolveButton from '~/helpers/svelte-components/button/SpendResolveButton.svelte';
import ToggleButton from '~/helpers/svelte-components/button/ToggleButton.svelte';
import ToggleOptionButton from '~/helpers/svelte-components/button/ToggleOptionButton.svelte';
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
   Meter,
   Text,
   Tabs,
   ScrollingContainer,
   LabeledElement,
   BorderedColumnList,
   TagContainer,
   AttributeInput,
   Button,
   ImagePicker,
   IntegerIncrementInput,
   LabeledTextInput,
   RarityInput,
   ResistanceInput,
   TextAreaInput,
   TopFilter,
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
   ArmorTraitSelect,
   AttackTraitSelect,
   AttackTypeSelect,
   AttributeSelect,
   CheckDifficultySelect,
   DamageReducedBySelect,
   InventoryItemTypeSelect,
   ModSelect,
   RaritySelect,
   RatingSelect,
   ResistanceSelect,
   ResourceSelect,
   RulesElementOperationSelect,
   ShieldTraitSelect,
   SkillSelect,
   SpeedSelect,
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
   AttributeButton,
   CondensedCheckButton,
   ExpandButton,
   IconButton,
   IconLabelButton,
   ImageButton,
   ItemCheckButton,
   MiniButton,
   MiniIconButton,
   ResistanceButton,
   ResistanceCheckButton,
   SpendResolveButton,
   ToggleButton,
   ToggleOptionButton,
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
