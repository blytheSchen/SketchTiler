/**
 * An list-based queue implementation with an O(1) enqueue and O(N) dequeue.
 * Is tied in performance with a linked list-based queue in practice due to CPU caching.
 * See queueBenchmark.js in the archive folder to witness it for yourself.
 */
export default class Queue {
  list = [];
  
  get length() { return this.list.length; }

  /**
   * Adds `element` to the back of the queue.
   * @param {any} element
   * @returns {void}
   */
  enqueue(element) {
    this.list.push(element);
  }

  /**
   * Returns the element at the front of the queue if there is one. Otherwise, returns `undefined`.
   * @returns {any | undefined}
   */
  dequeue() {
    return this.list.shift();
  }
}
