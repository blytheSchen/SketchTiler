/**
 * A linked list-based queue implementation with an O(1) enqueue/dequeue.
 * Is tied in performance with an list-based queue in practice due to CPU caching.
 * See queueBenchmark.js in the archive folder to witness it for yourself.
 */
export default class Queue {
  front = null;
  back = null;
  length = 0;

  /**
   * Adds `element` to the back of the queue.
   * @param {any} element
   * @returns {void}
   */
  enqueue(element) {
    const node = new Node(element);

    if (this.length === 0) {
      this.front = node;
      this.back = node;
    } else {
      this.back.next = node;
      this.back = node;
    }

    this.length++;
  }

  /**
   * Returns the element at the front of the queue if there is one. Otherwise, returns `undefined`.
   * @returns {any | undefined}
   */
  dequeue() {
    if (this.length === 0) return undefined;

    const element = this.front.data;
    this.front = this.front.next;
    this.length--;

    if (!this.front) this.back = null; // if queue is now empty

    return element;
  }
}

/** A node of a linked list. */
class Node {
  /** @param {any} data */
  constructor(data) {
    this.data = data;
    this.next = null;
  }
}
