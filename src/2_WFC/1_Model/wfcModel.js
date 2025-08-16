import ImageLearner from "./imageLearner.js";
import ConstraintSolver from "./constraintSolver.js";
import Bitmask from "./Bitmask.js";

export default class WFCModel {
  imageLearner = new ImageLearner();
  constraintSolver = new ConstraintSolver();
  performanceProfile = {}

  /**
   * Stores the set tile instructions generated from the user's usage of setTile().
   * @type {SetTileInstruction[]}
   */
  setTilesInstructions = [];

  /**
   * Learns the patterns of one or more images.
   * Doesn't process images as periodic, and doesn't rotate or reflect patterns.
   * Additionally, clears all set tiles.
   * @param {TilemapImage[]} images The images to learn. If you only want to learn one pass an array with a single image in it.
   * @param {number} N The width and height of the patterns.
   * @param {bool} profile (Default false) Whether to profile the performance of this function or not.
   */
  learn(images, N, profile = false, printPatterns = false) {
    this.patterns = this.imageLearner.learn(images, N, profile, printPatterns);
    this.clearSetTiles();

    return this;
  }

  /**
   * Set the tile at (x, y) to be any of the ids for future generated images.
   * @param {number} x
   * @param {number} y
   * @param {number[]} ids
   */
  setTile(x, y, ids) {
    const combinedTilePatternsBitmask = new Bitmask(this.imageLearner.patterns.length);
    for (const id of ids) {
      if (!this.imageLearner.tilesToPatterns.has(id)) throw new Error(`ID ${id} not found in patterns.`);
      const tilePatternsBitmask = this.imageLearner.tilesToPatterns.get(id);
      combinedTilePatternsBitmask.mergeWith(tilePatternsBitmask);
    }
    this.setTilesInstructions.push([y, x, combinedTilePatternsBitmask]);
  }

  /** Clear all tiles previously set. */
  clearSetTiles() {
    this.setTilesInstructions = [];
  }

  /**
   * Attempts to generate an image based on previously learned pattern data. Returns null if unsuccessful.
   * @param {number} width The width of the output image.
   * @param {number} height The height of the output image.
   * @param {number} maxAttempts (Default 10)
   * @param {bool} logProgress (Default true) Whether to log the progress of this function or not.
   * @param {bool} profile (Default false) Whether to profile the performance of this function or not.
   * @returns {TilemapImage | null}
   */
  generate(width, height, maxAttempts = 10, logProgress = true, profile = false) {
    const success = this.constraintSolver.solve(
      this.imageLearner.weights, 
      this.imageLearner.adjacencies, 
      this.setTilesInstructions, 
      width, height, maxAttempts, logProgress, profile
    );

    if(profile) this.performanceProfile = this.constraintSolver.performanceProfiler.returnData();
    return success ? this.generateImage() : null;
  }

  /**
   * Builds and returns an image using the learned patterns and solved wave matrix.
   * @returns {TilemapImage}
   */
  generateImage() {
    const image = [];
    for (let y = 0; y < this.constraintSolver.waveMatrix.length; y++) image[y] = [];

    // Build the image using the top left tile of each cell's pattern
    for (let y = 0; y < this.constraintSolver.waveMatrix.length; y++) {
    for (let x = 0; x < this.constraintSolver.waveMatrix[0].length; x++) {
      const possiblePatterns_Array = this.constraintSolver.waveMatrix[y][x].toArray();
      const i = possiblePatterns_Array[0];	// should be guaranteed to only have 1 possible pattern
      const tileID = this.imageLearner.patterns[i][0][0];
      image[y][x] = tileID;
    }}

    return image;
  }
}