/**
 * Represents an optimized 2D array of type `Array`, `Int32Array`, or `Uint32Array`.
 * There are provided methods for interfacing with this class.
 */
// TODO: able to write @ type {Matrix<Array<BigBitmask>>}, etc in JSDoc annotations
//       @type {Matrix<Array | Int32Array | Uint32Array>} ?
export default class Matrix {
  /** @type {number} */
  width;

  /** @type {number} */
  height;

  /**
   * - 1D arrays (e.g. a = [1, 2, 3, 4]) are faster than 2D ones (e.g. const a = [ [1, 2], [3, 4] ]).
   * - Static arrays (e.g. a = new Array(1, 2, 3, 4)) are faster than dynamic ones (e.g. a = [1, 2, 3, 4]).
   * - Typed arrays (e.g. a = new Int8Array([1, 2, 3, 4])) are faster than regular/plain/untyped ones (e.g. a = new Array(1, 2, 3, 4)).
   * - 32 bit integers (e.g. a = new Int32Array([1, 2, 3, 4])) are faster than 8 and 16 bit ones (e.g. a = new Int8Array([1, 2, 3, 4])).
   * - Unsigned integers (e.g. a = new Uint32Array([1, 2, 3, 4])) are faster than signed ones (e.g. a = new Int32Array([1, 2, 3, 4])).
   * 
   * This class represents an optimized 2D array because it implements a 1D static array at worst
   * and a 1D static typed 32 bit unsigned integer array at best.
   * 
   * @type {Array | Int32Array | Uint32Array}
   */
  data;

  /**
   * @param {number} width
   * @param {number} height
   * @param {ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor} ArrayType
   */
  constructor(width, height, ArrayType) {
    this.width = width;
    this.height = height;
    this.data = new ArrayType(width * height);
  }

  /**
   * Returns the element at position (`x`, `y`).
   * This method is the `Matrix` equivalent to `array2d[y][x]`.
   * @param {number} x 
   * @param {number} y 
   * @returns {number | any} Note: an element of type `any` can be returned **if and only if** `ArrayType` was set to `Array` during this `Matrix`'s construction.
   */
  get(x, y) {
    return this.data[this.index(x, y)];
  }

  /**
   * Sets the element at position (`x`, `y`) to `value`.
   * This method is the `Matrix` equivalent to `array2d[y][x] = value`.
   * @param {number} x 
   * @param {number} y 
   * @param {number | any} value Note: `value` can be of type `any` **if and only if** `ArrayType` was set to `Array` during this `Matrix`'s construction.
   */
  set(x, y, value) {
    this.data[this.index(x, y)] = value;
  }

  /**
   * Converts the 2D position (`x`, `y`) to its equivalent 1D array index in row-major (row by row, column by column) order.
   * @param {number} x 
   * @param {number} y 
   * @returns {number}
   */
  index(x, y) {
    if (this.outOfRange(x, y))
      throw new RangeError(`Position out of range: (${x}, ${y})`);
    
    return y * this.width + x;
  }

  /**
   * Returns whether an element at position (`x`, `y`) exists within this `Matrix`.
   * @param {number} x 
   * @param {number} y 
   * @returns {boolean}
   */
  outOfRange(x, y) {
    return x < 0 || x >= this.width || y < 0 || y >= this.height;
  }

  /**
   * Allows us to iterate through the `Matrix` within for...of loops in row-major (row by row, column by column) order.
   * Yields a list containing the element, its x position, its y position, and its index each iteration.
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_generators
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_generators#iterables
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_generators#user-defined_iterables
   * 
   * @example
   * const matrix = new Matrix(3, 3, Uint32Array);
   * 
   * for (const [_, x, y, i] of matrix) {
   *  matrix.set(x, y, i);
   * }
   * 
   * for (const [element] of matrix) {
   *  console.log(element);
   * }
   * 
   * -> Output: "0", "1", "2", "3", "4", "5", "6", "7", "8"
   */
  *[Symbol.iterator]() {
    for (let y = 0; y < this.height; y++) {
    for (let x = 0; x < this.width; x++) {
      yield [this.get(x, y), x, y, this.index(x, y)];
    }}
  }
}
