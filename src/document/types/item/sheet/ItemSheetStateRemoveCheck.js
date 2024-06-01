/**
 * Removes the check at the provided idx from an Item sheet's reactive application state.
 * @param {object} state - The state to update.
 * @param {number} idx - The idx of the Check to remove.
 * @returns {object} The updated state.
 */
export default function itemSheetStateRemoveCheck(state, idx) {
   state.isExpanded.checks.splice(idx, 1);
   state.isExpanded.sidebar.check.splice(idx, 1);
   return state;
}