/**
 * @fileoverview
 * Sketch canvas input handler for a shape-drawing system.
 * Supports drawing, undo/redo history, stroke normalization, and communication with a Phaser scene.
 * 
 * Dependencies:
 * - LineDisplayble, MouseDisplayable (displayables.js)
 * - conf (canvasConfig.js)
 * - normalizeStrokes, inCanvasBounds, showDebugText (canvasUtils.js)
 * - undo, redo, getSnapshot (canvasHistory.js)
 */

import { LineDisplayble, MouseDisplayable } from "./1_Classes/displayables.js";
import { WorkingLine } from "./1_Classes/line.js";
import { conf } from "./2_Utils/canvasConfig.js";
import { normalizeStrokes, inCanvasBounds, showDebugText } from "./2_Utils/canvasUtils.js"
import { undo, redo, getSnapshot } from "./2_Utils/canvasHistory.js"

// Canvas setup
const sketchCanvas = document.getElementById("sketch-canvas");
const ctx = sketchCanvas.getContext("2d");

/** Current in-progress line. */
let workingLine = new WorkingLine({ 
	points: [], 
	thickness: conf.lineThickness, 
	hue: 0, 
	structure: null,
});

/** Mouse cursor/tool. */ 
let mouseObject = new MouseDisplayable({
	x: 0,
	y: 0,
	hue: 0,
	active: false,
}, conf.lineThickness);

let displayList = [];     // Displayed strokes currently on canvas.
let redoDisplayList = []; // Strokes removed via undo, recorded for redo support

let undoStack = []; // Snapshots of canvas state for undo operations
let redoStack = []; // Snapshots of canvas state for redo operations

let activeButton; // Active structure type selected via button (e.g. 'house', 'tree').

// Structure buttons setup
for (const type in conf.structures) {
	const structure = conf.structures[type];
	const button = document.getElementById(`${type.toLowerCase()}-button`);
	if(!button) continue;

	// set activeButton to clicked button and change stroke attributes
	button.onclick = () => {
		mouseObject.mouse.hue = structure.color;
		button.style.borderColor = structure.color;  
		activeButton = type;
	}
}
// Default to 'house' for initial selected marker
document.getElementById("house-button").click(); 

// Custom event for repainting the canvas after changes.
const changeDraw = new Event("drawing-changed"); 
sketchCanvas.addEventListener("drawing-changed", () => {
	ctx.clearRect(0, 0, sketchCanvas.width, sketchCanvas.height);
	for (const d of displayList) 
		d.display(ctx);
});

// Custom event for updating the mouse tool position.
const movedTool = new Event("tool-moved");
sketchCanvas.addEventListener("tool-moved", () => {
	ctx.clearRect(0, 0, sketchCanvas.width, sketchCanvas.height);
	for (const d of displayList) 
		d.display(ctx);
	mouseObject.display(ctx);
});

// Start drawing a new stroke.
sketchCanvas.addEventListener("mousedown", (ev) => {
	// Update cursor
	mouseObject = new MouseDisplayable({
		x: ev.offsetX,
		y: ev.offsetY,
		hue: mouseObject.mouse.hue,
		active: true,
	}, conf.lineThickness);

	// Start a stroke
	if (inCanvasBounds(mouseObject.mouse, sketchCanvas)){ 
		// save current canvas state before adding a stroke
		undoStack.push(getSnapshot());

		// update new workingLine with mouseObject settings
		workingLine = {
			points: [mouseObject.mouse],
			thickness: conf.lineThickness,
			hue: mouseObject.mouse.hue,
			structure: activeButton,
		};

		// add working line to displayList
		displayList.push(new LineDisplayble(workingLine)); 

		// clear redo history
		redoDisplayList = [];

		// redraw canvas with new stroke + cursor position
		sketchCanvas.dispatchEvent(changeDraw);
		sketchCanvas.dispatchEvent(movedTool);
	}
});

// Continue drawing stroke as mouse moves.
sketchCanvas.addEventListener("mousemove", (ev) => {
	// Update cursor
	mouseObject = new MouseDisplayable({
		x: ev.offsetX,
		y: ev.offsetY,
		hue: mouseObject.mouse.hue,
		active: mouseObject.mouse.active,
	}, conf.lineThickness);

	// Draw a stroke (if cursor is active)
	if (mouseObject.mouse.active) {
		if (inCanvasBounds({ x: mouseObject.mouse.x, y: mouseObject.mouse.y }, sketchCanvas)){ 
			// add new point to working line
			workingLine.points.push({
				x: mouseObject.mouse.x,
				y: mouseObject.mouse.y,
			});

			// add stroke to canvas
			sketchCanvas.dispatchEvent(changeDraw);

			// enable exports
			exportButton.disabled = false;
		}
	}

	// redraw sketch canvas to capture new cursor position
	sketchCanvas.dispatchEvent(movedTool);
});

// Finish drawing stroke and optionally normalize.
sketchCanvas.addEventListener("mouseup", (ev) => {
	// Update cursor
	mouseObject = new MouseDisplayable({
		x: ev.offsetX,
		y: ev.offsetY,
		hue: mouseObject.mouse.hue,
		active: false,
	}, conf.lineThickness);

	// Finish stroke (if it is long enough)
	if(workingLine.points.length <= conf.sizeThreshold){
		displayList.pop();  // remove accidental tiny stroke
		undoStack.pop();	// also forget this canvas state
	} else {
		// normalize strokes (if normalize toggle is checked)
		normalizing = document.getElementById("normalize-toggle").checked;
		if (normalizing) normalizeStrokes(displayList, sketchCanvas);

		// clear redo history
		redoStack = [];

		// redraw sketch canvas with new stroke + cursor position
		sketchCanvas.dispatchEvent(changeDraw);
		sketchCanvas.dispatchEvent(movedTool);
	}
});

// Hide cursor when it leaves canvas area
sketchCanvas.addEventListener("mouseleave", (e) => {
	mouseObject = new MouseDisplayable({
		x: -1,
		y: -1,
		hue: mouseObject.mouse.hue,
		active: false,
	}, 0);

	// redraw sketch canvas to capture new cursor position
	sketchCanvas.dispatchEvent(movedTool);
});

// Clears canvas and structure display list.
const clearButton = document.getElementById(`clear-button`);
const clearPhaser = new CustomEvent("clearSketch");	// clears phaser canvas
clearButton.onclick = () => {
	// push canvas snapshot to undo stack before clearing
	undoStack.push(getSnapshot());
	
	// clear display lists
	displayList = [];
	redoDisplayList = [];
	
	// clear canvas
	ctx.clearRect(0, 0, sketchCanvas.width, sketchCanvas.height);
	window.dispatchEvent(clearPhaser);		// clear phaser canvas
	sketchCanvas.dispatchEvent(changeDraw);	// redraw sketch canvas 

	exportButton.disabled = true;	
};

// Sends sketch data to Phaser via custom event.
const generateButton = document.getElementById("generate-button");
generateButton.onclick = () => {
	// label strokes with structure type
	showDebugText(ctx, displayList);
	
	// sends sketch data to Phaser scene
	const toPhaser = new CustomEvent("generate", { 
		detail: {sketch: displayList, structures: conf.structures} 
	});
	window.dispatchEvent(toPhaser);
}

// Normalize strokes (straighten lines, find shapes, etc)
const normalizeToggle = document.getElementById("normalize-toggle");
let normalizing = normalizeToggle.checked;
normalizeToggle.onclick = () => {
	// update normalizing tracker bool to reflect toggle value
	normalizing = document.getElementById("normalize-toggle").checked;
	if (normalizing){ 
		normalizeStrokes(displayList, sketchCanvas); 
		sketchCanvas.dispatchEvent(changeDraw); // Re-render the canvas after simplifying
	}
}

// Undo last action and re-render canvas.
const undoButton = document.getElementById(`undo-button`);
undoButton.onclick = () => {
	if (undoStack.length === 0) return; // nothing to undo

	// perform undo and push undone data to redo stack
	redoStack.push(undo(undoStack.pop()));

	// update canvas to reflect undo
	sketchCanvas.dispatchEvent(changeDraw);
}

// Redo last undone action and re-render canvas.
const redoButton = document.getElementById(`redo-button`);
redoButton.onclick = () => {
	if (redoStack.length === 0) return; // nothing to redo

	// perform redo and push redone data to undo stack
	undoStack.push(redo(redoStack.pop()));

	// update canvas to reflect redo
	sketchCanvas.dispatchEvent(changeDraw);
}

/**
 * Keyboard shortcuts:
 * - Ctrl/Cmd + Z → Undo
 * - Ctrl/Cmd + Shift + Z → Redo
 */
document.addEventListener('keydown', (e) => {
	if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
		// Ctrl/Cmd + Shift + Z → Redo
		if (e.shiftKey) document.getElementById("redo-button").click();

		// Ctrl/Cmd + Z → Undo
		else document.getElementById("undo-button").click();
	}
});

/**
 * Returns current display list arrays.
 * @param {"display"|"redo"} [l] - Which list to return (displayList or redoDisplayList).
 * @returns {LineDisplayble[]}
 */
export function getDisplayList(l) {
	if (!l || l.toLowerCase() === "display") return displayList;
	else if (l.toLowerCase() === "redo") return redoDisplayList;
}


/**
 * Overwrites the display list arrays.
 * @param {LineDisplayble[]} data - New list of strokes.
 * @param {"undo"|"redo"} [key="undo"] - Which list to update.
 */
export function setDisplayList(data, key) {
	if (!key || key.toLowerCase() === "undo") displayList = data;
	else if (key.toLowerCase() === "redo") redoDisplayList = data;
}

// EXPORTS
const exportButton = document.getElementById("export-sketch-button");
exportButton.disabled = true;

exportButton.addEventListener("click", async () => {
    const zip = JSZip();
	await exportSketch(zip)

	// generate zip
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "sketchtiler_export_sketch.zip");
});

// loads JSZip zip file with sketch data and sketch canvas snapshot
export async function exportSketch(zip){
    // add sketch data to the zip
    zip.file("sketchData.json", JSON.stringify({
      sketch: displayList,
    }));

    // add sketch image to the zip
    const canvas = document.getElementById("sketch-canvas");
    const dataURL = canvas.toDataURL("image/PNG")
    const base64Data = dataURL.replace(/^data:image\/(png|jpg);base64,/, "");

    zip.file("sketchImage.png", base64Data, { base64: true });
	
	exportButton.disabled = true;
}
