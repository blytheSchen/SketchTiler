/**
 * @class Regions
 * Processes structured sketches (like houses, fences, etc.) to define regions 
 * in tile coordinates. Supports two region types: "box" (bounding area) and 
 * "trace" (exact stroke path).
 */
export class Regions {
  /**
   * Maps region type keys ("box", "trace") to handler functions.
   * @type {[key: string]: (strokes: any) => any}
   */
  regionBlock = {
    box: (strokes) => this.getBoundingBox(strokes),
    trace: (strokes) => this.getTrace(strokes),
  };

  /**
   * Tracks structure strokes and where the last display list was processed.
   */
  structureSketches = { lastIndex: -1 }

  /**
   * @param {any[]} sketch - The full displayList of sketch data.
   * @param {Record<string, {color: string, regionType: "box"|"trace"}>} structures - All possible structure types and their metadata.
   * @param {number} cellSize - The size of a tile/grid cell in pixels.
   */
  constructor(sketch, structures, cellSize) {
    this.cellSize = cellSize;

    // prepare structureSketches for each structure type
    for (const type in structures) {
      this.structureSketches[type] = {
        info: structures[type],
        strokes: []
      }
    }

    this.updateStructureSketchHistory(sketch);
    this.sketch = this.structureSketches;

  }

  /**
   * Computes the region definitions for each structure type in the sketch.
   * Groups strokes, defines regions (box/trace), and organizes them by structure type.
   *
   * @returns {Record<string, any[]>} A dictionary of structure types to region data.
   */
  get() {
    let result = {};

    for (let structType in this.sketch) {
      let struct = this.sketch[structType];

      // only looking through structures (not other attributes) with points drawn
      if (struct.info && struct.strokes && struct.strokes.length > 0) {
        result[structType] = [];
        let regionType = struct.info.regionType;

        // group nearby strokes into a single stroke before defining region
        struct.strokes = this.groupNearby(struct.strokes);

        // define regions (box or trace) for every stroke of this structure
        for (let stroke of struct.strokes) {
          result[structType].push(
            this.regionBlock[regionType](stroke, struct.info.color)
          );
        }
      }
    }

    return result;
  }

   /**
   * Adds new strokes from the displayList to structureSketches.
   * Skips empty strokes or those without structure type metadata.
   * 
   * @param {any[]} displayList
   */
    updateStructureSketchHistory(displayList){
      // only add new strokes (added since last generation call)
      for(let i = this.structureSketches.lastIndex + 1; i < displayList.length; i++){
        let stroke = displayList[i].line;

        // ignore invis "strokes" and non-structure strokes
        if(stroke.points.length > 1 && stroke.structure){ 
          this.structureSketches[stroke.structure].strokes.push(stroke.points);
        }
      }

      this.structureSketches.lastIndex = displayList.length - 1;
    }


  /**
   * Clears all structure stroke history.
   */
  clearStructureSketchHistory(){
    for(let s in structureSketches){
      if(structureSketches[s].strokes){ 
        structureSketches[s].strokes = []; 
      }
    }
    structureSketches.lastIndex = -1;
  }

 /**
   * Groups strokes that are spatially close into merged stroke arrays.
   *
   * @param {any[][]} strokes - An array of stroke arrays.
   * @param {number} [threshold=2] - Proximity threshold in tile units.
   * @returns {any[][]} Array of grouped strokes.
   */
  groupNearby(strokes, threshold = 2) {
    const visited = new Array(strokes.length).fill(false);  // visit flags
    const result = [];

    // BFS
    for (let i = 0; i < strokes.length; i++) {
      if (visited[i]) continue;

      const group = [];     // current group
      const queue = [i];    // search queue
      visited[i] = true;    // mark index as visited

      while (queue.length > 0) {
        const current = queue.shift();
        group.push(...strokes[current]);    // add strokes to current group

        for (let j = 0; j < strokes.length; j++) {
          if (
            !visited[j] &&
            this.strokesNearby(strokes[current], strokes[j], threshold)
          ) {
            visited[j] = true;  // mark index as visited
            queue.push(j);      // add nearby stroke to search queue
          }
        }
      }

      result.push(group);       // add grouped strokes to array
    }

    return result;
  }

/**
   * Checks whether two strokes are close enough to be grouped.
   *
   * @param {any[]} strokeA
   * @param {any[]} strokeB
   * @param {number} threshold
   * @returns {boolean}
   */
  strokesNearby(strokeA, strokeB, threshold) {
    const boxA = this.getBoundingBox(strokeA);
    const boxB = this.getBoundingBox(strokeB);

    return (
      boxA.topLeft.x - threshold < boxB.bottomRight.x &&
      boxA.bottomRight.x + threshold > boxB.topLeft.x &&
      boxA.topLeft.y - threshold < boxB.bottomRight.y &&
      boxA.bottomRight.y + threshold > boxB.topLeft.y
    );
  }

  /**
   * Draws a bounding box region around a stroke.
   *
   * @param {Point[]} stroke
   * @returns {{topLeft: Point, bottomRight: Point, width: number, height: number}}
   */
  getBoundingBox(stroke) {
    if (!stroke) return;

    const outputWidth = window.game.config.width / this.cellSize;
    const outputHeight = window.game.config.height / this.cellSize;

    let tiles = this.pointsToCells(stroke);

    // get top-left and bottom-right of stroke and fill in that region of tiles
    let topLeft = { x: outputWidth, y: outputHeight };
    let bottomRight = { x: -1, y: -1 };
    for (let tile of tiles) {
      // top-left
      if (tile.x < topLeft.x) {
        topLeft.x = tile.x;
      }
      if (tile.y < topLeft.y) {
        topLeft.y = tile.y;
      }

      // bottom-right
      if (tile.x > bottomRight.x) {
        bottomRight.x = tile.x;
      }
      if (tile.y > bottomRight.y) {
        bottomRight.y = tile.y;
      }
    }

    return {
      topLeft: topLeft,
      bottomRight: bottomRight,
      width: 1 + bottomRight.x - topLeft.x,
      height: 1 + bottomRight.y - topLeft.y
    };
  }

  /**
   * Returns an array of grid tiles that the stroke path passes through.
   *
   * @param {Point[]} stroke
   * @returns {Point[]}
   */
  getTrace(stroke) {
    if (!stroke) return;

    let result = this.pointsToCells(stroke);

    // normalized squares, triangles will have very few points.
    //    need to fill in-between tiles in these cases
    if (result.length < 5) {
      result = this.completeShape(result);
    }

    return result;
  }

/**
 * Fills in missing grid cells between widely spaced points using linear interpolation.
 * Prevents sparse shapes (e.g. triangles, boxes) from being represented as only corners.
 * 
 * @param {Point[]} points - The shape’s outline in grid space (typically snapped).
 * @returns {Point[]} - A new array with filled-in tiles between each pair.
 */
  completeShape(points) {
    // if there aren't at least 2 points, no lines can be formed — return as-is.
    if (!points || points.length < 2) return points;

    const filled = [];

    // loop over each point and its neighbor (wrapping around to close the shape).
    for (let i = 0; i < points.length; i++) {
      const start = points[i];
      const end = points[(i + 1) % points.length]; // next point (wraps around for closed shape)

      // compute distance in x and y direction...
      const dx = end.x - start.x;
      const dy = end.y - start.y;

      // ... and use the longer direction to determine how many steps to take.
      // (this ensures consistent spacing regardless of direction)
      const steps = Math.max(Math.abs(dx), Math.abs(dy));

      // linear interpolation between start and end
      for (let j = 0; j <= steps; j++) {
        const x = Math.round(start.x + (dx * j) / steps);
        const y = Math.round(start.y + (dy * j) / steps);

        filled.push({ x, y });
      }
    }

    return filled;
  }


  /**
   * Converts stroke point coordinates to grid cells based on cell size.
   *
   * @param {Point[]} stroke - Raw point data from canvas (in pixels).
   * @returns {Point[]} - Unique grid cell coordinates touched by the stroke.
 
   */
  pointsToCells(stroke) {
    let result = [];

    for (let point of stroke) {
      result.push(this.getCell(point.x, point.y));
    }

    result = this.removeDuplicates(result);
    return result;
  }

  /**
   * Converts a pixel coordinate to a grid cell.
   *
   * @param {number} x - The x coordinate in pixels.
   * @param {number} y - The y coordinate in pixels.
   * @returns {Point} - Cell coordinates in grid space.
   */
  getCell(x, y) {
    return {
      x: Math.floor(x / this.cellSize),
      y: Math.floor(y / this.cellSize),
    };
  }

  /**
   * Removes duplicate objects from an array of coordinate objects.
   * Uses JSON stringification to treat objects with the same keys/values as equal.
   *
   * @param {Point[]} arr - An array of grid cell coordinates.
   * @returns {Point[]} - Array with unique entries only.
   */
  removeDuplicates(arr) {
    const uniqueArray = Array.from(
      new Set(arr.map(obj => JSON.stringify(obj)))  // convert each object to a unique string
    ).map(str => JSON.parse(str));                  // parse strings back into objects

    return uniqueArray;
  }

}
