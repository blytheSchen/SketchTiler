import ImageLearner from "./ImageLearner.js";
import ConstraintSolver from "./ConstraintSolver.js";
import BigBitmask from "./BigBitmask.js";

/** A self-contained instance of the Wave Function Collapse algorithm
 *  that's capable of learning the patterns of one or more images
 *  and generating as many similar output images as you'd like. */
export default class WFCModel {
  imageLearner = new ImageLearner();
  constraintSolver = new ConstraintSolver();

  /** @type {SetTileInstruction[]} */
  setTilesInstructions = [];

  /**
   * Learns the patterns of one or more images.
   * Doesn't process images as periodic, and doesn't rotate or reflect patterns.
   * Additionally clears all set tiles.
   * @param {TilemapImage[]} images The images to learn. If you only desire to learn one, pass an array with a single image in it.
   * @param {number} N The width and height of the patterns (in tiles).
   * @param {bool} profilePerformance Whether to profile the performance of this function and display it in the console. (Default = false)
   * @returns {void}
   */
  learn(images, N, profilePerformance = false) {
    this.imageLearner.learn(images, N, profilePerformance);
    this.clearSetTiles();
    return this;
  }

  /**
   * Defines the set of possible IDs the tile at position (`x`, `y`) can be.
   * @param {number} x
   * @param {number} y
   * @param {number[]} ids
   * @returns {void}
   */
  setTile(x, y, ids) {
    const combinedTilePatternsBitmask = new BigBitmask(this.imageLearner.patterns.length);

    for (const id of ids) {
      if (!this.imageLearner.tilesToPatterns.has(id))
        throw new Error(`Tile '${id}' could not be found in any of the learned patterns.`);
      const tilePatternsBitmask = this.imageLearner.tilesToPatterns.get(id);
      combinedTilePatternsBitmask.mergeWith(tilePatternsBitmask);
    }

    this.setTilesInstructions.push([y, x, combinedTilePatternsBitmask]);
  }

  /**
   * Clears all set tiles, allowing them to have any ID again.
   * @returns {void}
   */
  clearSetTiles() {
    this.setTilesInstructions = [];
  }

  /**
   * Attempts to generate an image based on the learned patterns. Returns null if unsuccessful.
   * @param {number} width The width of the output image (in tiles).
   * @param {number} height The height of the output image (in tiles).
   * @param {number} maxAttempts The max amount of tries to generate an image. (Default = 10)
   * @param {bool} logProgress Whether to log the progress of this function in the console. (Default = false) 
   * @param {bool} profilePerformance Whether to profile the performance of this function and display it in the console. (Default = false)
   * @returns {TilemapImage | null}
   */
  generate(width, height, maxAttempts = 10, logProgress = false, profilePerformance = false) {
    const success = this.constraintSolver.solve(
      this.imageLearner.weights,
      this.imageLearner.adjacencies,
      this.setTilesInstructions,
      width,
      height,
      maxAttempts,
      logProgress,
      profilePerformance,
    );

    return success ? this.buildImage() : null;
  }

  /**
   * Builds the image contained within the solved wave matrix.
   * @returns {TilemapImage}
   */
  buildImage() {
    const image = [];
    for (let y = 0; y < this.constraintSolver.waveMatrix.length; y++) image[y] = [];

    // Build the image using the top left tile of each cell's chosen pattern
    for (let y = 0; y < this.constraintSolver.waveMatrix.length; y++) {
    for (let x = 0; x < this.constraintSolver.waveMatrix[0].length; x++) {
      const chosenPatternIndex = this.constraintSolver.waveMatrix[y][x].toArray()[0];
      const tileId = this.imageLearner.patterns[chosenPatternIndex][0][0];
      image[y][x] = tileId;
    }}

    return image;
  }
}