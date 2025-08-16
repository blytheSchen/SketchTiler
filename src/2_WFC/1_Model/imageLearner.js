import DIRECTIONS from "./DIRECTIONS.js";
import Bitmask from "./Bitmask.js";
import PerformanceProfiler from "../../5_Utility/PerformanceProfiler.js";

export default class ImageLearner {
  /**
   * Stores the tiles of every pattern, where element i is the tiles of pattern i.
   * @type {Pattern[]}
   */
  patterns;

  /**
   * Stores the weight of every pattern, where element i is the weight of pattern i.
   * @type {number[]}
   */
  weights;

  /**
   * Stores the adjacencies of every pattern, where element i is the adjacencies of pattern i.
   * @type {AdjacentPatternsMap[]}
   */
  adjacencies;

  /**
   * For each tile, stores which patterns contain that tile as its top left tile.
   * @type {Map<number, TilePatternsBitmask>}
   */
  tilesToPatterns;

  performanceProfiler = new PerformanceProfiler();

  /**
   * Learns the patterns of one or more images. Doesn't process images as periodic, and doesn't rotate or reflect patterns.
   * @param {TilemapImage[]} images The images to learn. If you only want to learn one pass an array with a single image in it.
   * @param {number} N The width and height of the patterns.
   * @param {bool} profile Whether to profile the performance of this function or not.
   */
  learn(images, N, profile, printPatterns = false) {
    this.patterns = [];
    this.weights = [];
    this.adjacencies = [];
    this.tilesToPatterns = new Map();

    this.performanceProfiler.clearData();
    this.profileFunctions(profile)

    this.getPatternsAndWeights(images, N);
    this.getAdjacencies();
    this.getTilesToPatterns();

    if (profile) this.performanceProfiler.logData();
    if(printPatterns){
      return this.patterns;
    }
  }

  /**
   * Registers/unregisters important member functions to the performance profiler.
   * @param {bool} value Whether to profile (register) or not (unregister).
   */
  profileFunctions(value) {
    if (value) {
      this.getPatternsAndWeights = this.performanceProfiler.register(this.getPatternsAndWeights, false);
      this.getPattern = this.performanceProfiler.register(this.getPattern, true);
      this.getAdjacencies = this.performanceProfiler.register(this.getAdjacencies, false);
      this.isAdjacent = this.performanceProfiler.register(this.isAdjacent, true);
      this.getTilesToPatterns = this.performanceProfiler.register(this.getTilesToPatterns, false);
    } else {
      this.getPatternsAndWeights = this.performanceProfiler.unregister(this.getPatternsAndWeights);
      this.getPattern = this.performanceProfiler.unregister(this.getPattern);
      this.getAdjacencies = this.performanceProfiler.unregister(this.getAdjacencies);
      this.isAdjacent = this.performanceProfiler.unregister(this.isAdjacent);
      this.getTilesToPatterns = this.performanceProfiler.unregister(this.getTilesToPatterns);
    }
  }

  /**
   * Populates this.patterns and this.weights.
   * @param {TilemapImage[]} images an array of 2D tile ID matrices that each represent a layer of a tilemap
   * @param {number} N the width and height of the learned patterns
   */
  getPatternsAndWeights(images, N) {
    /*
      Because patterns[] must only contain unique ones, we have to get patterns and weights together
      When we find duplicate patterns, throw them out and increment the original pattern's weight
      Use a map to filter out duplicates and know the index of the element in weights[] to increment
    */

    const uniquePatterns = new Map();	// <pattern, index>

    for (const image of images) {
      for (let y = 0; y < image.length-N+1; y++) {	// length-N+1 because we're not processing image as periodic
      for (let x = 0; x < image[0].length-N+1; x++) {	// length-N+1 because we're not processing image as periodic

        const p = this.getPattern(image, N, y, x);
        const p_str = p.toString();	// need to convert to string because maps compare arrays using their pointers
        if (uniquePatterns.has(p_str)) {
          const i = uniquePatterns.get(p_str);
          this.weights[i]++;
        } else {
          this.patterns.push(p);
          this.weights.push(1);
          uniquePatterns.set(p_str, this.patterns.length-1);
        }
      }}
    }
  }

  /**
   * @param {TilemapImage} image an array of 2D tile ID matrices that each represent a layer of a tilemap
   * @param {number} N the width and height of the learned patterns
   * @param {number} y the y position of the window that captures the pattern
   * @param {number} x the x position of the window that captures the pattern
   * @returns {Pattern}
   */
  getPattern(image, N, y, x) {
    const pattern = [];
    for (let ny = 0; ny < N; ny++) pattern[ny] = [];

    for (let ny = 0; ny < N; ny++) {
    for (let nx = 0; nx < N; nx++) {
      pattern[ny][nx] = image[y+ny][x+nx];
    }}

    return pattern;
  }

  /** Populates this.adjacencies. */
  getAdjacencies() {
    /*
      Check each pattern against every other pattern, including itself, in every direction
      Because pattern adjacency is commutative (A is adjacent to B means B is adjacent to A)
      We don't need to check combos that we've already done
      Hence why j starts at i
    */

    for (let i = 0; i < this.patterns.length; i++) {
      this.adjacencies.push([
        new Bitmask(this.patterns.length),	// up
        new Bitmask(this.patterns.length),	// down
        new Bitmask(this.patterns.length),	// left
        new Bitmask(this.patterns.length)	// right
      ]);
    }		

    const oppositeDirIndex = new Map([[0, 1], [1, 0], [2, 3], [3, 2]]);	// input direction index k to get opposite direction index o

    for (let i = 0; i < this.patterns.length; i++) {
      for (let j = i; j < this.patterns.length; j++) {
        for (let k = 0; k < DIRECTIONS.length; k++) {
          if (this.isAdjacent(this.patterns[i], this.patterns[j], DIRECTIONS[k])) {
            const o = oppositeDirIndex.get(k);
            this.adjacencies[i][k].setBit(j);
            this.adjacencies[j][o].setBit(i);
          }
        }
      }
    }
  }

  /**
   * Determines if p1 is to the {dir} of p2. This result also tells you whether p2 is to the {opposite dir} of p1.
   * @param {Pattern} p1
   * @param {Pattern} p2
   * @param {Direction} dir
   * @returns {boolean}
   */
  isAdjacent(p1, p2, dir) {
    /*
      Check if the patterns overlap, for example:
      Suppose dir is UP ([-1, 0])

        p1
      X	X	X			p2
      1	2	3		1	2	3
      4	5	6		4	5	6
              X	X	X

      If every number in p1 matches with its corresponding number in p2, then p1 is to the top of p2
    */

    const start = new Map([[-1, 1], [1, 0], [0, 0]]);
    const end = new Map([[-1, 0], [1, -1], [0, 0]]);
    const dy = dir[0];
    const dx = dir[1];
    const startY = start.get(dy);
    const startX = start.get(dx);
    const endY = p1.length + end.get(dy);
    const endX = p1[0].length + end.get(dx);

    for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const tile1ID = p1[y][x];
      const tile2ID = p2[y+dy][x+dx];
      if (tile1ID !== tile2ID) return false;
    }}
    return true;
  }

  /** Populates this.tilesToPatterns. */
  getTilesToPatterns() {
    for (let i = 0; i < this.patterns.length; i++) {
      const tileID = this.patterns[i][0][0];
      if (this.tilesToPatterns.has(tileID)) this.tilesToPatterns.get(tileID).setBit(i);
      else this.tilesToPatterns.set(tileID, new Bitmask(this.patterns.length).setBit(i));
    }
  }
}