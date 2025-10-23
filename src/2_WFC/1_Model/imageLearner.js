import PerformanceProfiler from "../../5_Utility/PerformanceProfiler.js";
import BigBitmask from "./BigBitmask.js";
import DIRECTIONS from "./DIRECTIONS.js";

/** A component of the WFCModel that's responsible for gathering all data
 *  necessary for solving a wave matrix and generating an image from it. */
export default class ImageLearner {
  /** Stores the tiles of every pattern.
   *  @example patterns[3] -> [ [1, 2], [3, 4] ]
   *  @type {Pattern[]} */
  patterns;

  /** Stores the number of occurrances of every pattern in the learned image(s).
   *  @type {number[]} */
  weights;

  /** Stores the adjacent patterns in each direction of every pattern.
   *  @type {AdjacentPatternsMap[]} */
  adjacencies;

  /** For each tile, stores which patterns contain that tile as its top left tile.
   *  @type {Map<number, TilePatternsBitmask>} */
  tilesToPatterns;

  performanceProfiler = new PerformanceProfiler();

  /**
   * Learns the patterns of one or more images. Doesn't process images as periodic, and doesn't rotate or reflect patterns.
   * @param {TilemapImage[]} images The images to learn.
   * @param {number} N The width and height of the patterns (in tiles).
   * @param {bool} profilePerformance Whether to profile the performance of this function and display it in the console.
   * @param {bool} printPatterns Whether to return the array of parsed patterns.
   */
  learn(images, N, profilePerformance, printPatterns = false) {
    this.patterns = [];
    this.weights = [];
    this.adjacencies = [];
    this.tilesToPatterns = new Map();

    this.performanceProfiler.clearData();
    this.profileFunctions(profilePerformance)

    this.learnPatternsAndWeights(images, N);
    this.learnAdjacencies();
    this.populateTilesToPatterns();

    if (profilePerformance) this.performanceProfiler.logData();
    if(printPatterns){
      return this.patterns;
    }
  }

  /**
   * Registers/unregisters important methods to `this.performanceProfiler`.
   * @param {bool} value Whether to register (true) or unregister (false).
   * @returns {void}
   */
  profileFunctions(value) {
    if (value) {
      this.getPatternsAndWeights = this.performanceProfiler.register(this.learnPatternsAndWeights, false);
      this.getPattern = this.performanceProfiler.register(this.learnPattern, true);
      this.getAdjacencies = this.performanceProfiler.register(this.learnAdjacencies, false);
      this.isAdjacent = this.performanceProfiler.register(this.isToTheDirectionOf, true);
      this.getTilesToPatterns = this.performanceProfiler.register(this.populateTilesToPatterns, false);
    } else {
      this.getPatternsAndWeights = this.performanceProfiler.unregister(this.learnPatternsAndWeights);
      this.getPattern = this.performanceProfiler.unregister(this.learnPattern);
      this.getAdjacencies = this.performanceProfiler.unregister(this.learnAdjacencies);
      this.isAdjacent = this.performanceProfiler.unregister(this.isToTheDirectionOf);
      this.getTilesToPatterns = this.performanceProfiler.unregister(this.populateTilesToPatterns);
    }
  }

  /**
   * Populates `this.patterns` and `this.weights`.
   * @param {TilemapImage[]} images The images to learn the patterns and their weights from.
   * @param {number} N The width and height of the patterns (in tiles).
   * @returns {void}
   */
  learnPatternsAndWeights(images, N) {
    /*
      We need to get patterns and weights at the same time because `this.patterns` must only contain unique patterns.
      When we find duplicate patterns, throw them out and increment the original pattern's weight.
      Use a map to filter out duplicates while still remembering the index of `this.weights` to increment.
    */

    /** @type {Map<string, number>} <patternAsString: string, patternIndex: number> */
    const uniquePatterns = new Map();

    for (const image of images) {

      for (let y = 0; y < image.length-N+1; y++) {    // `length-N+1` because we're not processing image as periodic
      for (let x = 0; x < image[0].length-N+1; x++) { // `length-N+1` because we're not processing image as periodic
        const pattern = this.learnPattern(image, N, y, x);
        const patternAsString = pattern.toString();	// convert to string because `Map` compares arrays using their pointers

        if (uniquePatterns.has(patternAsString)) {
          const index = uniquePatterns.get(patternAsString);
          this.weights[index]++;
        } else {
          this.patterns.push(pattern);
          this.weights.push(1);

          const patternIndex = this.patterns.length-1;
          uniquePatterns.set(patternAsString, patternIndex);
        }
      }}
    }
  }

  /**
   * @param {TilemapImage} image The image to learn the pattern from.
   * @param {number} N The width and height of the pattern (in tiles).
   * @param {number} globalY The y position of the pattern's upper left tile.
   * @param {number} globalX the x position of the pattern's upper left tile.
   * @returns {Pattern}
   */
  learnPattern(image, N, globalY, globalX) {
    const pattern = [];
    for (let relativeY = 0; relativeY < N; relativeY++) pattern[relativeY] = new Uint32Array(N);

    for (let relativeY = 0; relativeY < N; relativeY++) {
    for (let relativeX = 0; relativeX < N; relativeX++) {
      pattern[relativeY][relativeX] = image[globalY+relativeY][globalX+relativeX];
    }}

    return pattern;
  }

  /**
   * Populates `this.adjacencies`.
   * @returns {void}
   */
  learnAdjacencies() {
    /*
      Check each pattern against every pattern (including itself) in every direction.
      Pattern adjacency is commutative (A is adjacent to B means B is adjacent to A).
      So we don't need to check combos that we've already done, hence why j starts at i.
    */

    for (let i = 0; i < this.patterns.length; i++) {
      this.adjacencies.push([
        new BigBitmask(this.patterns.length),	// up
        new BigBitmask(this.patterns.length),	// down
        new BigBitmask(this.patterns.length),	// left
        new BigBitmask(this.patterns.length),	// right
      ]);
    }		

    /** Input the index of direction k to get the index of opposite direction o. */
    const oppositeDirectionIndex = new Map([
      [0, 1], // up     (index 0) ->  down  (index 1)
      [1, 0], // down   (index 1) ->  up    (index 0)
      [2, 3], // left   (index 2) ->  right (index 3)
      [3, 2], // right  (index 3) ->  left  (index 2)
    ]);

    for (let i = 0; i < this.patterns.length; i++) {
      for (let j = i; j < this.patterns.length; j++) {
        for (let k = 0; k < DIRECTIONS.length; k++) {
          if (this.isToTheDirectionOf(this.patterns[i], DIRECTIONS[k], this.patterns[j])) {
            const o = oppositeDirectionIndex.get(k);
            this.adjacencies[i][k].setBit(j);
            this.adjacencies[j][o].setBit(i);
          }
        }
      }
    }
  }

  /**
   * Returns whether `pattern1` is to the `direction` of `pattern2`.
   * This also tells you whether `pattern2` is to the opposite direction of `pattern1`.
   * @param {Pattern} pattern1
   * @param {Direction} direction
   * @param {Pattern} pattern2
   * @returns {boolean}
   */
  isToTheDirectionOf(pattern1, direction, pattern2) {
    /*
      Check if the patterns overlap, for example:
      Suppose `direction` is UP ([-1, 0])

      pattern1
      X	X	X		pattern2
      1	2	3		1	2	3
      4	5	6		4	5	6
              X	X	X

      If every number in pattern1 matches with its corresponding number in pattern2,
      e.g. the value at '1' in `pattern1` is the same as the value at '1' in `pattern2` and so on,
      then pattern1 is to the 'up' of pattern2
    */

    const dy = direction[0];
    const dx = direction[1];

    const start = new Map([[-1, 1], [1, 0], [0, 0]]);
    const end = new Map([[-1, 0], [1, -1], [0, 0]]);
    const startY = start.get(dy);
    const startX = start.get(dx);

    const endY = pattern1.length + end.get(dy);
    const endX = pattern1[0].length + end.get(dx);

    for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const tile1Id = pattern1[y][x];
      const tile2Id = pattern2[y+dy][x+dx];
      if (tile1Id !== tile2Id) return false;
    }}
    return true;
  }

  /**
   * Populates `this.tilesToPatterns`.
   * @returns {void}
   */
  populateTilesToPatterns() {
    for (let i = 0; i < this.patterns.length; i++) {
      const topLeftTileId = this.patterns[i][0][0];

      if (this.tilesToPatterns.has(topLeftTileId)) {
        const tilePatternsBitmask = this.tilesToPatterns.get(topLeftTileId);
        tilePatternsBitmask.setBit(i);
      } else {
        const tilePatternsBitmask = new BigBitmask(this.patterns.length).setBit(i);
        this.tilesToPatterns.set(topLeftTileId, tilePatternsBitmask);
      }
    }
  }
}