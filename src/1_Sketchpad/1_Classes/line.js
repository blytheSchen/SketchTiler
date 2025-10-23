/**
 * Represents a single point in 2D space.
 */
export class Point {
    /**
     * Creates a Point.
     * @param {number} x - The x-coordinate.
     * @param {number} y - The y-coordinate.
     */
    constructor(x, y){
        /** @type {number} */
        this.x = x;

        /** @type {number} */
        this.y = y;
    }
}

/**
 * Represents a drawn line with styling and semantic info.
 */
export class WorkingLine {
    /**
     * Creates a WorkingLine.
     * @param {Point[]} points - The list of points in the line.
     * @param {number} thickness - Line thickness in pixels.
     * @param {number} hue - Hue value for the line color.
     * @param {string|null} structure - The associated structure type, if any.
     */
    constructor(points, thickness, hue, structure) {
        /** @type {Point[]} */
        this.points = points;

        /** @type {number} */
        this.thickness = thickness;

        /** @type {number} */
        this.hue = hue;

        /** @type {string|null} */
        this.structure = structure;
    }
}
