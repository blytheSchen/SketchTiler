/**
 * @fileoverview
 * The main goal with this class is to have it replace as many 2D arrays in the WFC files as possible for some likely performance gains.
 * 
 * The second goal with this class is to partner it with the `BigBitmask` class for some crazy optimization.
 * As you can see, the `data` property can be an ArrayBuffer. This type has not yet been accounted for in the implementation of this class.
 * See 'FasterBigBitmask.js' for more information.
 */

/**
 * Represents an optimized 2D array of type `Array`, `Int32Array`, or `Uint32Array`.
 * There are provided methods for interfacing with this class.
 */
export default class Matrix {
  /** @type {number} */
  width;

  /** @type {number} */
  height;

  /**
   * - 1D arrays (e.g. a = [1, 2, 3, 4]) are faster than 2D ones (e.g. const a = [ [1, 2], [3, 4] ]).
   * - Static arrays (e.g. a = new Array(1, 2, 3, 4)) are faster than dynamic ones (e.g. a = [1, 2, 3, 4]).
   * - Typed arrays (e.g. a = new Uint32Array([1, 2, 3, 4])) are faster than regular/plain/untyped ones (e.g. a = new Array(1, 2, 3, 4)).
   * 
   * This class represents an optimized 2D array because it at least implements a 1D static array, if not a 1D static typed array, with `data`.
   * 
   * @type {Array | Int32Array | Uint32Array | ArrayBuffer}
   */
  data;

  /**
   * @param {number} width
   * @param {number} height
   * @param {ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor | ArrayBufferConstructor} ArrayType
   */
  constructor(width, height, ArrayType) {
    this.width = width;
    this.height = height;
    this.data = new ArrayType(width * height);
  }

  /**
   * @param {Array[] | Int32Array[] | Uint32Array[]} array2d
   * @param {ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor | ArrayBufferConstructor} ArrayType
   * @returns {Matrix}
   */
  static from2dArray(array2d, ArrayType) {
    const width = array2d[0].length;
    const height = array2d.length;

    const matrix = new Matrix(width, height, ArrayType);
    for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      matrix.set(x, y, array2d[y][x]);
    }}
    return matrix;
  }

  /**
   * @param {Matrix} matrix
   * @param {ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor | ArrayBufferConstructor} ArrayType
   * @returns {Matrix}
   */
  static fromMatrix(matrix, ArrayType = Array) {
    const newMatrix = new Matrix(matrix.width, matrix.height, ArrayType);
    for (let i = 0; i < matrix.data.length; i++) {
      newMatrix.data[i] = matrix.data[i];
    }
    return newMatrix;
  }

  /**
   * Converts 2D coordinates (`x`, `y`) to a 1D row-major array index.
   * @param {number} x 
   * @param {number} y 
   * @returns {number}
   */
  index(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height)
      throw new RangeError(`Index out of bounds: (${x}, ${y})`);
    
    return y * this.width + x;
  }

  /**
   * Returns the element at position (`x`, `y`).
   * @param {number} x 
   * @param {number} y 
   * @returns {number | any} Note: an element of type `any` can be returned **if and only if** this `Matrix` is backed by a plain `Array`.
   */
  get(x, y) {
    return this.data[this.index(x, y)];
  }

  /**
   * Sets the element at position (`x`, `y`) to `value`.
   * @param {number} x 
   * @param {number} y 
   * @param {number | any} value Note: `value` can be of type `any` **if and only if** this `Matrix` is backed by a plain `Array`.
   */
  set(x, y, value) {
    this.data[this.index(x, y)] = value;
  }

  /**
   * Allows us to iterate through the `Matrix` within for...of loops in row-major (row by row, column by column) order.
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_generators
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_generators#iterables
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_generators#user-defined_iterables
   * 
   * @example
   * const matrix = Matrix.from2dArray([
   *  [1, 2, 3],
   *  [4, 5, 6],
   * ]);
   * 
   * for (const element of matrix) {
   *  console.log(element);
   * }
   * 
   * -> Output: "1", "2", "3", "4", "5", "6"
   */
  *[Symbol.iterator]() {
    for (let y = 0; y < this.height; y++) {
    for (let x = 0; x < this.width; x++) {
      yield this.get(x, y);
    }}
  }
}
