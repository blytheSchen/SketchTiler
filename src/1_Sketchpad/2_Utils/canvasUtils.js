import { LineDisplayble } from "../1_Classes/displayables.js";
import { chaikinSmooth, ramerDouglasPeucker } from "./lineCleanup.js";
import { getShape } from "./shapeDetection.js";

/**
 * Attempts to clean up and normalize all lines in the display list.
 * If a shape (circle/triangle/rectangle) can be detected, replaces the line with that shape.
 * If not, simplifies and smooths the stroke using RDP and Chaikin smoothing.
 *
 * @param {LineDisplayble[]} displayList - List of drawable line objects to normalize.
 * @param {HTMLCanvasElement} canvas - Canvas to clamp point coordinates to.
 */
export function normalizeStrokes(displayList, canvas){
	// shape-ify each line in displayList
	for (const displayable of displayList) {
		// only operate on LineDisplayble objects
		if (displayable instanceof LineDisplayble) {
			if(!displayable.normalized){	// skip already-normalized lines
				displayable.normalized = true;

				// try to detect a known geometric shape
				const shape = getShape(displayable.line.points);

				if(shape){					
					// shape is recognized, snap stroke to shape points (already normalized)
					displayable.line.points = shape.points;
				} else {
					// for unrecognized shapes, de-noise stroke by running rdp, then chaikin
					const simplified = ramerDouglasPeucker(displayable.line.points, 10); // Adjust tolerance as needed
					const smoothed = chaikinSmooth(simplified, 4);

					// clamp all points to canvas bounds
					displayable.line.points = smoothed.filter(p => inCanvasBounds(p, canvas));
				}
			}
		}
	}
}

/**
 * Checks if a point lies within the visible bounds of a canvas.
 *
 * @param {Point} p - The point to test.
 * @param {HTMLCanvasElement} canvas - The canvas whose bounds to test against.
 * @returns {boolean} True if the point is inside the canvas; false otherwise.
 */
export function inCanvasBounds(p, canvas) {
	return (
		p.x >= 0 && 
		p.x <= canvas.width-1 && 
		p.y >= 0 && 
		p.y <= canvas.height-1
	);
}

/**
 * Draws text labels on the canvas next to the first point of each line, showing their structure type.
 * Used for debugging the stroke classification system.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context to draw on.
 * @param {LineDisplayble[]} displayList - List of lines to annotate.
 */
export function showDebugText(ctx, displayList){
	ctx.fillStyle = "black";      
	for(let d of displayList){
		let line = d.line;
		ctx.fillText(line.structure, line.points[0].x, line.points[0].y)
	}
}