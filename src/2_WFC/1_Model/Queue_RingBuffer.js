/**
 * A ring buffer-based queue implementation with an O(1) enqueue/dequeue.
 * Is the fastest implementation in theory since it doesn't need to create/destroy memory per operation.
 * However, is tied with the other implementations in practice due to a variety of reasons.
 * See queueBenchmark.js in the archive folder to witness it for yourself.
 * 
 * Please note that this implementation can only store numbers and has a fixed capacity.
 */
export default class Queue {
  /** The array that stores the elements of this `Queue`.
   *  @type {Int32Array | Uint32Array} */
  array;

  /** The max amount of elements this `Queue` can hold.
   *  @type {number} */
  capacity;

  /** The current amount of elements this `Queue` is holding.
   *  @type {number} */
  count = 0;

  /** The index of the element at the front of this `Queue`.
   *  @type {number} */
  front = 0;

  /** The index of the element at the back of this `Queue`.
   *  @type {number} */
  back = -1;

  /**
   * @param {number} capacity The max amount of numbers this `Queue` can hold.
   * @param {Int32ArrayConstructor | Uint32ArrayConstructor} ArrayType 
   */
  constructor(capacity, ArrayType) {
    this.array = new ArrayType(capacity);
    this.capacity = capacity;
  }

  /**
   * Adds each element in `elements` to the back of the queue.
   * @param {...number} elements
   * @returns {void}
   */
  enqueue(...elements) {
    for (const num of elements) {
      if (this.count >= this.capacity) throw new Error("Tried to enqueue into a Queue that's full");

      this.back = (this.back + 1) % this.capacity;
      this.array[this.back] = num;
      this.count++;
    }
  }

  /**
   * Removes and returns the element at the front of the queue.
   * @returns {number}
   */
  dequeue() {
    if (this.count <= 0) throw new Error("Tried to dequeue from a Queue that's empty.")

    const element = this.array[this.front];
    this.front = (this.front + 1) % this.capacity;
    this.count--;
    return element;
  }
}
