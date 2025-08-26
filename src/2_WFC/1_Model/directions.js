/**
 * Unit vectors for [up, down, left, right], in [y, x] order.
 * Positive y points down; positive x points right.
 * @type {Direction[]}
 */
const DIRECTIONS = [
  new Int32Array([-1, 0]), // up
  new Int32Array([1, 0]), // down
  new Int32Array([0, -1]), // left
  new Int32Array([0, 1]), // right
];
export default DIRECTIONS;
