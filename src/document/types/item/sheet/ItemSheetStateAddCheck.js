/**
 * Adds a Check to an Item sheet's reactive application state.
 * @param {object} state - The state to update.
 * @returns {object} The updated state.
 */
export default function itemSheetStateAddCheck(state) {
   state.isExpanded.checks.push(true);
   state.isExpanded.sidebar.check.push(true);
   return state;
}