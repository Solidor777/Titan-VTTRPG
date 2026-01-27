import deepFreeze from '~/helpers/utility-functions/DeepFreeze.js';

export const ACCURACY_ICON = 'fas fa-bow-arrow';
export const ARMOR_ICON = 'fas fa-helmet-battle';
export const AWARENESS_ICON = 'fas fa-eye';
export const BODY_ICON = 'fas fa-hand-fist';
export const CHECKED_ICON = 'fas fa-square-check';
export const CLEAVE_ICON = 'fas fa-scythe';
export const COLLAPSED_ICON = 'fas fa-angle-double-right';
export const CREATE_ICON = 'fas fa-circle-plus';
export const CURRENCY_ICON = 'fas fa-coins';
export const CUSTOM_ICON = 'fas fa-star';
export const DAMAGE_ICON = 'fas fa-burst';
export const DECREASE_SPEED_ICON = 'fas fa-person-running';
export const DECREMENT_ICON = 'fas fa-minus';
export const DEFENSE_ICON = 'fas fa-shield';
export const DELETE_ICON = 'fas fa-trash';
export const DICE_ICON = 'fas fa-dice';
export const DURATION_ICON = 'fas fa-clock';
export const EDIT_ICON = 'fas fa-pen-to-square';
export const EDIT_TOKEN_ICON = 'fas fa-user-circle';
export const EXPANDED_ICON = 'fas fa-angle-double-down';
export const EXPERTISE_ICON = 'fas fa-graduation-cap';
export const EXPIRED_ICON = 'fas fa-trash-clock';
export const FAST_HEALING_ICON = 'fas fa-heart';
export const HALF_DAMAGE_ICON = 'fas fa-heart-half-stroke';
export const HEALING_ICON = 'fas fa-heart';
export const ID_ICON = 'fas fa-id-card';
export const IGNORE_ARMOR_ICON = 'fas fa-shield-slash';
export const IMPORT_ICON = 'fas fa-download';
export const INCREASE_SPEED_ICON = 'fas fa-person-running';
export const INCREMENT_ICON = 'fas fa-plus';
export const INITIATIVE_ICON = 'fas fa-clock';
export const INSPIRATION_ICON = 'fas fa-sun';
export const LINKED_ICON = 'fas fa-link';
export const LONG_REST_ICON = 'fas fa-bed';
export const MELEE_ICON = 'fas fa-sword';
export const MIND_ICON = 'fas fa-brain';
export const MOD_ICON = 'fas fa-plus-minus';
export const MULTI_ATTACK_ICON = 'fas fa-swords';
export const NO_MULTI_ATTCK_ICON = 'fas fa-sword';
export const OVERKILL_ICON = 'fas fa-explosion';
export const PERMANENT_ICON = 'fas fa-infinity';
export const PERSISTENT_DAMAGE_ICON = 'fas fa-burst';
export const RADIUS_ICON = 'fas fa-bullseye';
export const RANGE_ICON = 'fas fa-ruler';
export const REGAIN_RESOLVE_ICON = 'fas fa-bolt';
export const REMOVE_TEMP_EFFECTS_ICON = 'fas fa-arrow-rotate-left';
export const REND_ICON = 'fas fa-hammer-crash';
export const REPAIR_ICON = 'fas fa-screwdriver-wrench';
export const RESET_ICON = 'fas fa-rotate-left';
export const RESOLVE_ICON = 'fas fa-bolt';
export const SEND_TO_CHAT_ICON = 'fas fa-comment';
export const SETTINGS_ICON = 'fas fa-cog';
export const SHORT_REST_ICON = 'fas fa-face-exhaling';
export const SOUL_ICON = 'fas fa-fire-flame-simple';
export const SPEND_RESOLVE_ICON = 'fas fa-bolt';
export const STAMINA_ICON = 'fas fa-heart';
export const TRAINING_ICON = 'fas fa-dumbbell';
export const TURN_END_ICON = 'fas fa-hourglass-end';
export const TURN_START_ICON = 'fas fa-hourglass-start';
export const UNCHECKED_ICON = 'fas fa-square';
export const UNLINKED_ICON = 'fas fa-unlink';
export const USER_ICON = 'fas fa-user-circle';
export const WOUNDS_ICON = 'fas fa-face-head-bandage';
export const RESILIENCE_ICON = 'fas fa-wave-pulse';
export const REFLEXES_ICON = 'fas fa-rabbit-running';
export const WILLPOWER_ICON = 'fas fa-solar-system';

/**
 * Mapping of concepts to their particular icon.
 * @type object
 */
const ICON_MAP = deepFreeze({
   accuracy: ACCURACY_ICON,
   armor: ARMOR_ICON,
   awareness: AWARENESS_ICON,
   body: BODY_ICON,
   checked: CHECKED_ICON,
   cleave: CLEAVE_ICON,
   collapsed: COLLAPSED_ICON,
   create: CREATE_ICON,
   currency: CURRENCY_ICON,
   custom: CUSTOM_ICON,
   damage: DAMAGE_ICON,
   decreaseSpeed: DECREASE_SPEED_ICON,
   decrement: DECREMENT_ICON,
   defense: DEFENSE_ICON,
   delete: DELETE_ICON,
   dice: DICE_ICON,
   duration: DURATION_ICON,
   edit: EDIT_ICON,
   expanded: EXPANDED_ICON,
   expertise: EXPERTISE_ICON,
   expired: EXPIRED_ICON,
   fastHealing: FAST_HEALING_ICON,
   halfDamage: HALF_DAMAGE_ICON,
   healing: HEALING_ICON,
   id: ID_ICON,
   ignoreArmor: IGNORE_ARMOR_ICON,
   import: IMPORT_ICON,
   increaseSpeed: INCREASE_SPEED_ICON,
   increment: INCREMENT_ICON,
   initiative: INITIATIVE_ICON,
   inspiration: INSPIRATION_ICON,
   linked: LINKED_ICON,
   longRest: LONG_REST_ICON,
   melee: MELEE_ICON,
   mind: MIND_ICON,
   mod: MOD_ICON,
   multiAttack: MULTI_ATTACK_ICON,
   noMultiAttack: NO_MULTI_ATTCK_ICON,
   overkill: OVERKILL_ICON,
   permanent: PERMANENT_ICON,
   persistentDamage: PERSISTENT_DAMAGE_ICON,
   radius: RADIUS_ICON,
   range: RANGE_ICON,
   regainResolve: REGAIN_RESOLVE_ICON,
   removeTempEffects: REMOVE_TEMP_EFFECTS_ICON,
   rend: REND_ICON,
   repair: REPAIR_ICON,
   reset: RESET_ICON,
   resolve: RESOLVE_ICON,
   sendToChat: SEND_TO_CHAT_ICON,
   settings: SETTINGS_ICON,
   shortRest: SHORT_REST_ICON,
   soul: SOUL_ICON,
   spendResolve: SPEND_RESOLVE_ICON,
   stamina: STAMINA_ICON,
   training: TRAINING_ICON,
   turnEnd: TURN_END_ICON,
   turnStart: TURN_START_ICON,
   unchecked: UNCHECKED_ICON,
   unlinked: UNLINKED_ICON,
   user: USER_ICON,
   wounds: WOUNDS_ICON,
   resilience: RESILIENCE_ICON,
   reflexes: REFLEXES_ICON,
   willpower: WILLPOWER_ICON,
});

/**
 * Gets the Icon for a concept from the concept map.
 * @param {string} concept - The concept to get the icon for.
 * @returns {string} The icon class for the provided constant.
 */
export function getIcon(concept) {
   return ICON_MAP[concept];
}
