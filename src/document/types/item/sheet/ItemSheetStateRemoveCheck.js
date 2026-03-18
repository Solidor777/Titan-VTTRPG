/**
 * Removes the check at the provided idx from an Item sheet's reactive application state.
 * @param {object} state - The state to update.
 * @param {number} idx - The idx of the Check to remove.
 * @returns {object} The updated state.
 */
export default function itemSheetStateRemoveCheck(state, idx) {
   state.checks.isExpanded.splice(idx, 1);
   state.sidebar.checks.isExpanded.splice(idx, 1);
   return state;
}
