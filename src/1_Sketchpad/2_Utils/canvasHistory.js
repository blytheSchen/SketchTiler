import { getDisplayList, setDisplayList } from "../sketchpad.js";


/**
 * Applies an undo action by restoring a previous canvas state and returning the current one as a snapshot.
 * 
 * @param {{display: Object[], redo: Object[]}} action - A snapshot of the canvas state to restore.
 * @returns {{display: Object[], redo: Object[]}} A snapshot of the canvas state before the undo was applied.
 */
export function undo(action){
	const snapshot = getSnapshot();				// save current state before overwriting

	setDisplayList([...action.display]);		// restore previous strokes
	setDisplayList([...action.redo], "redo");	// restore previous redo list for future use

	return snapshot;	// return the snapshot that we just replaced
}

/**
 * Applies a redo action by restoring a "future" canvas state and returning the current one as a snapshot.
 * 
 * @param {{display: Object[], redo: Object[]}} action - A snapshot of the canvas state to redo to.
 * @returns {{display: Object[], redo: Object[]}} A snapshot of the canvas state before the redo was applied.
 */
export function redo(action) {
	const snapshot = getSnapshot();				// save current state before overwriting

	setDisplayList([...action.display]);		// restore previous strokes
	setDisplayList([...action.redo], "redo");	// restore previous redo list for future use

	return snapshot;	// return the snapshot that we just replaced
}

/**
 * Creates a deep snapshot of the current display state, including both undo and redo stacks.
 * Useful for saving/restoring canvas history.
 *
 * @returns {{display: Object[], redo: Object[]}} A full snapshot of the current canvas display state.
 */
export function getSnapshot(){
    return {
		display: [...getDisplayList()],			// copy of strokes on canvas
		redo: [...getDisplayList("redo")]		// copy of strokes that were undone
	};
}

