/** @typedef {import("./Matrix.js").default} Matrix */

/**
 * Iterates through `waveMatrix` from left to right, top to bottom,
 * returning the position of the first unsolved `Cell` encountered.
 * An unsolved `Cell` has more than one possible patterns.
 * 
 * This heuristic is not suitable for all tilesets.
 * However, Tiny Town is not one of those tilesets.
 * 
 * @param {Matrix} waveMatrix A 2D grid of `Cell`s, where each `Cell` corresponds to a tile in the image being generated and stores the possible patterns that tile can yield from.
 * @param {Uint32Array} lastObservedCellPosition The [x, y] coordinate of the last cell that was observed. Used to skip the processing of already observed `Cell`s.
 * @returns {Uint32Array | null} The [x, y] coordinate of the `Cell` to observe. If all cells are solved, returns `null`.
 */
export function lexical(waveMatrix, lastObservedCellPosition) {
    let [startX, startY] = lastObservedCellPosition;

    for (let y = startY; y < waveMatrix.height; y++) {
        for (let x = startX; x < waveMatrix.width; x++) {
            const numPossiblePatterns = waveMatrix.get(x, y).toArray().length;
            if (numPossiblePatterns > 1) return new Uint32Array([x, y]);
        }
        startX = 0;
    }

    return null;
}

/**
 * Builds an array of the positions of all unsolved cells tied with the least Shannon Entropy and returns a random position from that array.
 * 
 * Shannon Entropy accounts for the number of possibilities and the weights of those possibilities.
 * For example, it's easier to choose between two things when one of them is liked by 99% of people,
 * compared to choosing between two things when one is liked by 50% of people and the other is liked by the other 50%.
 * 
 * This heuristic is suitable for all tilesets.
 * 
 * @param {Cell[][]} waveMatrix A 2D grid of `Cell`s, where each `Cell` corresponds to a tile in the image being generated and stores the possible patterns that tile can yield from.
 * @param {Uint32Array} weights The number of occurrances of every pattern.
 * @returns {Uint32Array | null} The [y, x] coordinate of the `Cell` to observe. If all cells are solved, returns `null`.
 */
export function leastShannonEntropy(waveMatrix, weights) {
    let leastEntropy = Infinity;
    let leastEntropyCellPositions = [];

    for (let y = 0; y < waveMatrix.length; y++) {
    for (let x = 0; x < waveMatrix[0].length; x++) {
      const entropy = getShannonEntropy(waveMatrix[y][x], weights);

      if (entropy < leastEntropy && entropy > 0) {
        leastEntropy = entropy;
        leastEntropyCellPositions = [new Uint32Array([y, x])];
      }
      else if (entropy === leastEntropy) {
        leastEntropyCellPositions.push(new Uint32Array([y, x]));
      }
    }}

    if (leastEntropyCellPositions.length > 0)
        return leastEntropyCellPositions[Math.floor(Math.random() * leastEntropyCellPositions.length)];
    else
        return null;
}
/**
 * Returns the Shannon Entropy of a `Cell` using its possible patterns and those patterns' weights.
 * @param {PossiblePatternsBitmask} possiblePatternsBitmask Contains the `Cell`'s possible patterns.
 * @param {Uint32Array} weights The number of occurrances of every pattern.
 * @returns {number}
 */
function getShannonEntropy(possiblePatternsBitmask, weights) {
    const possiblePatterns = possiblePatternsBitmask.toArray();

    if (possiblePatterns.length === 0) throw new Error("Contradiction found.");
    if (possiblePatterns.length === 1) return 0; // optimization to avoid unecessary calculation

    let sumOfWeights = 0;
    let sumOfWeightLogWeights = 0;
    for (const index of possiblePatterns) {
        const weight = weights[index];
        sumOfWeights += weight;
        sumOfWeightLogWeights += weight * Math.log(weight);
    }

    return Math.log(sumOfWeights) - sumOfWeightLogWeights/sumOfWeights;
}