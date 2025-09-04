/**
 * Represents a bitmask that's able to store more bits than a standard integer bitmask (32 bits).
 * A `BigBitmask` is to a bitmask as a `BigInt` is to a `number`.
 * There are provided methods for interfacing with this class.
 * 
 * Use the `buffer` parameter during contruction when making a collection of `BigBitmasks`
 * to take advantage of the performance gains of sequential memeory access and CPU caching.
 * 
 * Bitmask lingo for understanding methods:
 * - 'Filled' bitmask         = a bitmask where all bits are 1.
 * - 'Empty/cleared' bitmask  = a bitmask where all bits are 0.
 * - 'Set' bit                = a bit with a value of 1.
 * - 'Unset' bit              = a bit with a value of 0.
 */
export default class BigBitmask {
  /** @type {number} */
  static BITS_PER_BITMASK = 32;

  /** @type {number} */
  static BYTES_PER_BITMASK = 4;

  /**
   * Since bitmasks are just a collection of bits and so are integers (e.g. 1001 = 9), integers are bitmasks!
   * And since a single int has a size of 4 bytes meaning it can only mask for up to 32 bits,
   * we can use an array of ints to represent one giant int.
   * 
   * Note that sometimes it may make more sense to view `bits` as one giant array of bits (or one giant int/bitmask),
   * while othertimes it may make more sense to view it as an array of groups of bits (or an int/bitmask array).
   * 
   * @type {Uint32Array}
   */
  bits;

  /**
   * @param {number} numBits In regards to WFC, this value is equal to the number of patterns learned.
   * @param {ArrayBuffer} [buffer] The `ArrayBuffer` storing the bits for this `BigBitmask` to use.
   * @param {number} [byteOffset] The byte offset of this `BigBitmask`'s bits within `buffer`. 
   */
  constructor(numBits, buffer = undefined, byteOffset = undefined) {
    this.bits = buffer
      ? new Uint32Array(buffer, byteOffset, BigBitmask.bitsToBitmasks((numBits)))
      : new Uint32Array(BigBitmask.bitsToBitmasks((numBits)));
  }

  /**
   * Returns the minimum amount of bitmasks needed to store `numBits`.
   * @param {number} numBits 
   * @returns {number}
   */
  static bitsToBitmasks(numBits) {
    return Math.ceil(numBits / BigBitmask.BITS_PER_BITMASK);
  }

  /**
   * Returns the minimum amount of bytes needed by a `BigBitmask` to store `numBits` bits.
   * @param {number} numBits
   * @returns {number}
   */
  static bitsToSizeInBytes(numBits) {
    return BigBitmask.bitsToBitmasks(numBits) * BigBitmask.BYTES_PER_BITMASK;
  }

  /**
   * Returns a bitmask where only the bit at `index` is set to 1.
   * @example 0 (decimal) -> 1 (binary)
   * @example 3 (decimal) -> 1000 (binary)
   * @param {number} index
   * @returns {number}
   */
  static indexToBitmask(index) {
    return 1 << index;
  }

  /**
   * Returns whether two `BigBitmasks` have identical bit values.
   * @param {BigBitmask} bigBitmask1
   * @param {BigBitmask} bigBitmask2
   * @returns {boolean}
   */
  static EQUALS(bigBitmask1, bigBitmask2) {
    for (let i = 0; i < bigBitmask1.bits.length; i++)
      if (bigBitmask1.bits[i] !== bigBitmask2.bits[i]) return false;

    return true;
  }

  /**
   * Returns a new `BigBitmask` with identical bit values to `source`.
   * @param {BigBitmask} source
   * @returns {BigBitmask}
   */
  static createDeepCopy(source, buffer = undefined, byteOffset = undefined) {
    const copy = new BigBitmask(source.bits.length * BigBitmask.BITS_PER_BITMASK, buffer, byteOffset);
    copy.bits = source.bits.slice(); // though Array.slice() makes a shallow copy, since we're copying primitive values (Uint32s) it doesn't matter
    return copy;
  }

  /**
   * Sets the bit at `index` to 1.
   * @param {number} index
   * @returns {this}
   */
  setBit(index) {
    const arrayIndex = Math.floor(index / BigBitmask.BITS_PER_BITMASK);
    this.bits[arrayIndex] |= BigBitmask.indexToBitmask(index);
    return this;
  }

  /**
   * Sets all bits to 1.
   * @returns {this}
   */
  fill() {
    // TODO: make this function

    // note: you can't simply just use this.bits.fill()
    // because this `BigBitmask` may hold more bits than it's supposed to mask
    // (hence why we need `BigBitmask.bitsToBitmasks()`)

    throw new Error("Method not implemented yet.")
  }

  /**
   * Unsets all bits to 0.
   * @returns {void}
   */
  clear() {
    this.bits.fill(0);
  }

  /**
   * Returns whether all bits are 0.
   * @returns {boolean}
   */
  isEmpty() {
    for (const Uint32 of this.bits)
      if (Uint32 !== 0) return false;

    return true;
  }

  /**
   * Unsets any set bits in this `BigBitmask` that are unset in `other`.
   * This method is analogous to a bitwise AND assignment (&=) operation.
   * @param {BigBitmask} other
   * @returns {this}
   */
  intersectWith(other) {
    for (let i = 0; i < this.bits.length; i++)
      this.bits[i] &= other.bits[i];

    return this;
  }

  /**
   * Sets any unset bits in this `BigBitmask` that are set in `other`.
   * This method is analogous to a bitwise OR assignment (|=) operation.
   * @param {BigBitmask} other
   * @returns {void}
   */
  mergeWith(other) {
    for (let i = 0; i < this.bits.length; i++)
      this.bits[i] |= other.bits[i];
  }

  /**
   * Returns an array containing the indices of all set bits in this `BigBitmask`.
   * @example 1 (binary) -> [0] (decimal)
   * @example 1010 (binary) -> [1, 3] (decimal)
   * @returns {number[]}
   */
  toArray() {
    // Extract all set bits from the Bitmask and push their indices into result

    const result = [];

    for (let i = 0; i < this.bits.length; i++) {
      let bitmask = this.bits[i]; // make a copy so we don't alter the actual value
      const base = i * BigBitmask.BITS_PER_BITMASK;

      while (bitmask !== 0) {
        const lowestSetBit_Signed = bitmask & -bitmask;
        // ex: 01100 (binary) -> 00100 (binary)
        // still confused? it's okay, search up two's complement

        const lowestSetBit_Unsigned = lowestSetBit_Signed >>> 0;
        // needed for if `index_Local` is 31 (without this you'd get a negative index)
        // if I recall correctly, the need for this operator is why we have to use a Uint32 array
        // instead of simply just using a BigInt (can't use this operator on those)

        const bitmaskIndex = Math.log2(lowestSetBit_Unsigned); // ex: 00100 (binary) -> 2 (decimal)
        const bigBitmaskIndex = base + bitmaskIndex;
        result.push(bigBitmaskIndex);

        bitmask ^= lowestSetBit_Unsigned; // unset the bit
      }
    }

    return result;
  }
}
