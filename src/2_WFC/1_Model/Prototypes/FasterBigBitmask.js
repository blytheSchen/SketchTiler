/**
 * @fileoverview
 * If you were to implement `data` in 'Matrix.js' as a single `ArrayBuffer`
 * that stored the bytes for the `Uint32Arrays` of the `BigBitmasks` that are used by the cells constituting the wave matrix,
 * you'd be approaching the limits of how optimized you can get with numeric arrays in JavaScript.
 * This design maximizes sequential memory accessing and CPU cache efficiency.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint32Array
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint32Array#different_ways_to_create_a_uint32array Look at the '// From an ArrayBuffer' section
 * 
 * 
 * Professor Adam Smith, during CMPM 121, was the one that first taught me
 * that you could work with typed arrays and bytes in JavaScript just like you could in C/C++.
 * 
 * If you really need some help on this, you could contact him.
 * He's also done research on WFC and is super knowledgeable on it in general.
 */