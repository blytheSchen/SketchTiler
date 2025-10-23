/** @typedef {import("../2_WFC/1_Model/BigBitmask.js").default} BigBitmask */

/**
 * @typedef {Int32Array} Direction An array of two numbers. The first stores y and the second stores x. Positive y points down while positive x points right.
 * 
 * @typedef {Int32Array[]} TilemapImage A 2D matrix of tile IDs that represents a layer of a tilemap.
 * 
 * @typedef {Uint32Array[]} Pattern A 2D NxN matrix of tile IDs.
 *
 * @typedef {BigBitmask} TilePatternsBitmask Given a tile A, stores which patterns contain A as their top left tile.
 * @typedef {[y: number, x: number, tilePatternsBitmask: TilePatternsBitmask]} SetTileInstruction
 * 
 * @typedef {BigBitmask} AdjacentPatternsBitmask Given a pattern A, stores which patterns are adjacent to A in a single direction.
 * @typedef {AdjacentPatternsBitmask[]} AdjacentPatternsMap An array of four AdjacentPatternsBitmasks. Given a pattern A, stores which patterns are adjacent to A in each of the four directions (in order of up, down, left, right).
 * 
 * @typedef {BigBitmask} PossiblePatternsBitmask Stores which patterns a cell can become.
 * 
 * @typedef {PossiblePatternsBitmask} Cell Currently the only info a cell needs to contain is its PossiblePatternsBitmask so for simplicity it is just that instead of an object containing it.
 */