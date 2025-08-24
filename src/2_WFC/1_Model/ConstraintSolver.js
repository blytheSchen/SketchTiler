import PerformanceProfiler from "../../5_Utility/PerformanceProfiler.js";

import BigBitmask from "./BigBitmask.js";
import Matrix from "./Matrix.js";

import {
  lexical,
  leastShannonEntropy,
} from "./cellSelectionHeuristics.js";

import {
  weightedRandom,
} from "./patternSelectionHeuristics.js"

// Uncommment the implementation you wish to use
import Queue from "./Queue_RingBuffer.js";
//import Queue from "./Queue_List.js";
//import Queue from "./Queue_LinkedList.js";

import DIRECTIONS from "./DIRECTIONS.js";

// TODO: get rid of all y, x and replace them with x, y in EVERY file


/** The component of the WFCModel that's solely responsible for solving the wave matrix. */
export default class ConstraintSolver {
  /** A `Matrix` of `Cell`s, where each `Cell` corresponds to a tile in the image being generated
   *  and stores the possible patterns that tile can yield from.
   *  In that sense, `waveMatrix` represents the entire possibility space of the image.
   *  @type {Matrix} */
  waveMatrix;

  performanceProfiler = new PerformanceProfiler();

  /**
   * Attempts to solve `this.waveMatrix` based on learned pattern data.
   * @param {number[]} weights The number of occurrances of every pattern.
   * @param {AdjacentPatternsMap[]} adjacencies The adjacent patterns in each direction of every pattern.
   * @param {SetTileInstruction[]} setTileInstructions Stores which `Cell`s have a limited choice in the possible patterns they can be and what those possible patterns are.
   * @param {number} width The width to set `this.waveMatrix` to.
   * @param {number} height The height to set `this.waveMatrix` to.
   * @param {number} maxAttempts The max amount of tries to solve `this.waveMatrix`.
   * @param {bool} logProgress Whether to log the progress of this function in the console.
   * @param {bool} profilePerformance Whether to profile the performance of this function and display it in the console.
   * @returns {bool} Whether the attempt was successful.
   */
  solve(weights, adjacencies, setTileInstructions, width, height, maxAttempts, logProgress, profilePerformance) {
    this.performanceProfiler.clearData();
    this.profileFunctions(profilePerformance);

    const waveMatrixBuffer = new ArrayBuffer(width * height * BigBitmask.bitsToSizeInBytes(weights.length));
    const queue = new Queue(width * height, Uint32Array);
    const lastObservedCellPosition = new Uint32Array([0, 0]);

    this.initializeWaveMatrix(width, height, weights.length, waveMatrixBuffer);
    this.setTiles(setTileInstructions, queue, adjacencies);

    let numAttempts = 1;
    while (numAttempts <= maxAttempts) { // use <= so `maxAttempts` is allowed to be set to 1
      
      const position = this.getCellToObservePosition(lastObservedCellPosition, weights);
      if (!position) {
        if (logProgress) console.log(`solved in ${numAttempts} attempt(s)`);
        if (profilePerformance) this.performanceProfiler.logData();
        return true;
      }
      const [x, y] = position;

      this.observe(x, y, weights);
      lastObservedCellPosition.set([x, y]);

      if (logProgress) console.log("propagating...");
      const contradictionCreated = this.propagate(x, y, queue, adjacencies);
      if (contradictionCreated) {
        this.initializeWaveMatrix(width, height, weights.length, waveMatrixBuffer);
        this.setTiles(setTileInstructions, queue, adjacencies);
        numAttempts++;
        lastObservedCellPosition.set([0, 0]);
      }
    }

    if (logProgress) console.log("max attempts reached");
    if (profilePerformance) this.performanceProfiler.logData();
    return false;
  }

  /**
   * Registers/unregisters important methods to `this.performanceProfiler`.
   * @param {bool} value Whether to register (true) or unregister (false).
   */
  profileFunctions(value) {
    if (value) {
      this.initializeWaveMatrix = this.performanceProfiler.register(this.initializeWaveMatrix, false);
      this.setTiles = this.performanceProfiler.register(this.setTiles, false);
      this.getCellToObservePosition = this.performanceProfiler.register(this.getCellToObservePosition, false);
      this.observe = this.performanceProfiler.register(this.observe, false);
      this.propagate = this.performanceProfiler.register(this.propagate, false);
    } else {
      this.initializeWaveMatrix = this.performanceProfiler.unregister(this.initializeWaveMatrix);
      this.setTiles = this.performanceProfiler.unregister(this.setTiles);
      this.getCellToObservePosition = this.performanceProfiler.unregister(this.getCellToObservePosition);
      this.observe = this.performanceProfiler.unregister(this.observe);
      this.propagate = this.performanceProfiler.unregister(this.propagate);
    }
  }

  /**
   * Initializes `this.waveMatrix` to a 2D grid of `Cell`s which have their possible patterns set to all.
   * @param {number} width The width to set `this.waveMatrix` to.
   * @param {number} height The height to set `this.waveMatrix` to.
   * @param {number} numPatterns Used as the size of the `Cell`'s `PossiblePatternBitmasks`.
   * @param {ArrayBuffer} buffer The `ArrayBuffer` storing the bits for the `PossiblePatternBitmasks` to use.
   */
  initializeWaveMatrix(width, height, numPatterns, buffer) {
    const allPatternsPossible = new BigBitmask(numPatterns);
    for (let i = 0; i < numPatterns; i++) allPatternsPossible.setBit(i); // TODO: use BigBitmask.fill() instead

    this.waveMatrix = new Matrix(width, height, Array);
    for (const [_, x, y, i] of this.waveMatrix) {
      this.waveMatrix.set(x, y, BigBitmask.createDeepCopy(
        allPatternsPossible,
        buffer,
        i * BigBitmask.bitsToSizeInBytes(numPatterns)
      ));
    }
  }

  /**
   * Executes the user's set tile instructions.
   * @param {SetTileInstruction[]} setTileInstructions Stores which `Cell`s have a limited choice in the possible patterns they can be and what those possible patterns are.
   * @param {AdjacentPatternsMap[]} adjacencies The adjacent patterns in each direction of every pattern.
   */
  setTiles(setTileInstructions, queue, adjacencies) {
    for (const [y, x, tilePatternsBitmask] of setTileInstructions) {
      if (this.waveMatrix.outOfRange(x, y)) {
        console.warn("A set tile instruction asks for a position outside of the wave matrix. Ignoring this instruction.");
        continue;
      }
      this.waveMatrix.get(x, y).intersectWith(tilePatternsBitmask);
      const contradictionCreated = this.propagate(x, y, queue, adjacencies);
      if (contradictionCreated) throw new Error("User's set tiles formed a contradiction.");
    }
  }

  /**
   * Chooses a cell to be observed using a cell selection heuristic.
   * @param {Uint32Array} lastObservedCellPosition Used by Lexical.
   * @param {Uint32Array} weights Used by Least Shannon Entropy.
   * @returns {Uint32Array} The [x, y] coordinate of the `Cell` to observe.
   */
  getCellToObservePosition(lastObservedCellPosition, weights) {
    // Uncomment the cell selection heuristic you wish to use.

    return lexical(this.waveMatrix, lastObservedCellPosition);
    //return leastShannonEntropy(this.waveMatrix, weights);
  }

  /**
   * Given the set of possible patterns a `Cell` in `this.waveMatrix` has,
   * chooses one of those patterns using a pattern selection heuristic.
   * @param {number} x The x position of `Cell` to observe in `this.waveMatrix`.
   * @param {number} y The y position of `Cell` to observe in `this.waveMatrix`.
   * @param {number[]} weights Used by Weighted Random.
   */
  observe(x, y, weights) {
    // Uncomment the pattern selection heuristic you wish to use.

    return weightedRandom(this.waveMatrix, x, y, weights);
  }

  /**
   * Adjusts the possible patterns of all `Cell`s affected by the observation of a `Cell`.
   * @param {number} x The x position of the observed `Cell` in `this.waveMatrix`.
   * @param {number} y The y position of the observed `Cell` in `this.waveMatrix`.
   * @param {Queue} queue The queue used to store the `Cell`s that need to be propagated.
   * @param {AdjacentPatternsMap[]} adjacencies The adjacent patterns in each direction of every pattern.
   * @returns {boolean} Whether a contradiction was created.
   */
  propagate(x, y, queue, adjacencies) {
    queue.enqueue(x, y);

    while (queue.count > 0) {
      const [x1, y1] = [queue.dequeue(), queue.dequeue()];
      const cell1_PossiblePatterns_Array = this.waveMatrix.get(x1, y1).toArray();

      for (let k = 0; k < DIRECTIONS.length; k++) {	// using k because k is associated with iterating over DIRECTIONS in the ImageProcessor class
        /*
          Given two adjacent cells: cell1 at (y1, x1) and cell2 at (y2, x2)

          Get cell2's currernt possible patterns
          Use the adjacency data of cell1's possible patterns to build a set of all possible patterns cell2 can be
          Create an array for cell2's new possible patterns by taking the shared elements between the two aforementioned data structures 

          If cell2's new possible patterns is the same size as its current: there were no changes - do nothing
          If cell2's new possible patterns is empty: there are no possible patterns cell2 can be - return contradiction
          If cell2's new possible patterns is smaller than its current: there were changes - enqueue cell2 so its adjacent cells can also be adjusted
        */

        const dir = DIRECTIONS[k];
        const dy = -dir[0];	// need to reverse direction or else output will be upside down
        const dx = -dir[1];	// need to reverse direction or else output will be upside down
        const y2 = y1+dy;
        const x2 = x1+dx;

        if (this.waveMatrix.outOfRange(x2, y2)) continue;

        const cell2_PossiblePatterns_Bitmask = this.waveMatrix.get(x2, y2);

        const cell1_PossibleAdjacentPatterns_Bitmask = new BigBitmask(adjacencies.length);
        for (const i of cell1_PossiblePatterns_Array) {
          const i_AdjacentPatterns_Bitmask = adjacencies[i][k];
          cell1_PossibleAdjacentPatterns_Bitmask.mergeWith(i_AdjacentPatterns_Bitmask);
        }

        const cell2_NewPossiblePatterns_Bitmask = BigBitmask.AND(cell2_PossiblePatterns_Bitmask, cell1_PossibleAdjacentPatterns_Bitmask);

        const contradictionCreated = cell2_NewPossiblePatterns_Bitmask.isEmpty();
        if (contradictionCreated) return true;
        
        const cell2Changed = !BigBitmask.EQUALS(cell2_PossiblePatterns_Bitmask, cell2_NewPossiblePatterns_Bitmask);
        if (cell2Changed) {
          this.waveMatrix.set(x2, y2, cell2_NewPossiblePatterns_Bitmask);
          queue.enqueue(x2, y2);
        }
      }
    }
    return false;	// no contradiction created
  }
}
