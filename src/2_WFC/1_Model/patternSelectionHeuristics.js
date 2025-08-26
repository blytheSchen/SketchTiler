/**
 * 
 * @param {Cell[][]} waveMatrix A 2D grid of `Cell`s, where each `Cell` corresponds to a tile in the image being generated and stores the possible patterns that tile can yield from.
 * @param {number} y The y position of the `Cell` to observe in `waveMatrix`.
 * @param {number} x The y position of the `Cell` to observe in `waveMatrix`.
 * @param {Uint32Array} weights The number of occurrances of every pattern.
 * @returns {void}
 */
export function weightedRandom(waveMatrix, y, x, weights) {
    // This implementation is based off the following:
    // https://dev.to/jacktt/understanding-the-weighted-random-algorithm-581p

    const possiblePatterns = waveMatrix[y][x].toArray();

    const possiblePatternWeights = [];	// a parallel array; is parallel with `possiblePatterns`
    let totalWeight = 0;
    for (const index of possiblePatterns) {
      const weight = weights[index];
      possiblePatternWeights.push(weight);
      totalWeight += weight;
    }

    const random = Math.random() * totalWeight;

    let cursor = 0;
    for (let i = 0; i < possiblePatternWeights.length; i++) {
      cursor += possiblePatternWeights[i];
      if (cursor >= random) {
        waveMatrix[y][x].clear();
        waveMatrix[y][x].setBit(possiblePatterns[i]);
        return;
      }
    }

    throw new Error("A pattern wasn't chosen within the for loop");
}