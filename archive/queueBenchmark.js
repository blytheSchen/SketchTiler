import Queue_List from "../src/2_WFC/1_Model/Queue_List.js";
import Queue_LinkedList from "../src/2_WFC/1_Model/Queue_LinkedList.js";
import Queue_RingBuffer from "../src/2_WFC/1_Model/Queue_RingBuffer.js";
import BigBitmask from "../src/2_WFC/1_Model/BigBitmask.js";

const NUM_TESTS = 100;
let queue_List_TotalDuration = 0;
let queue_LinkedList_TotalDuration = 0;
let queue_RingBuffer_TotalDuration = 0;

const NUM_PROPAGATIONS = 500;     // number of times propagate() is called
const NUM_SUB_PROPAGATIONS = 500; // number of times propagate() adjusts a cell
const NUM_PATTERNS = 500;

const queue_List = new Queue_List();
const queue_LinkedList = new Queue_LinkedList();
const queue_RingBuffer = new Queue_RingBuffer(NUM_SUB_PROPAGATIONS, Uint32Array);

let start;
let end;
let duration;

for (let t = 0; t < NUM_TESTS; t++) {

    start = performance.now();
    for (let i = 0; i < NUM_PROPAGATIONS; i++) {
        for (let j = 0; j < NUM_SUB_PROPAGATIONS; j++) {
            const element = Math.random() * NUM_PATTERNS;
            queue_List.enqueue(element);
        }
        for (let j = 0; j < NUM_SUB_PROPAGATIONS; j++) {
            queue_List.dequeue();
        }
    }
    end = performance.now();
    duration = end - start;
    queue_List_TotalDuration += duration;

    start = performance.now();
    for (let i = 0; i < NUM_PROPAGATIONS; i++) {
        for (let j = 0; j < NUM_SUB_PROPAGATIONS; j++) {
            const element = Math.random() * NUM_PATTERNS;
            queue_LinkedList.enqueue(element);
        }
        for (let j = 0; j < NUM_SUB_PROPAGATIONS; j++) {
            queue_LinkedList.dequeue();
        }
    }
    end = performance.now();
    duration = end - start;
    queue_LinkedList_TotalDuration += duration;

    start = performance.now();
    for (let i = 0; i < NUM_PROPAGATIONS; i++) {
        for (let j = 0; j < NUM_SUB_PROPAGATIONS; j++) {
            const element = Math.random() * NUM_PATTERNS;
            queue_RingBuffer.enqueue(element);
        }
        for (let j = 0; j < NUM_SUB_PROPAGATIONS; j++) {
            queue_RingBuffer.dequeue();
        }
    }
    end = performance.now();
    duration = end - start;
    queue_RingBuffer_TotalDuration += duration;
}

console.log(`List: ${(queue_List_TotalDuration / NUM_TESTS).toFixed(2)} ms`);
console.log(`Linked List: ${(queue_LinkedList_TotalDuration / NUM_TESTS).toFixed(2)} ms`);
console.log(`Ring Buffer: ${(queue_RingBuffer_TotalDuration / NUM_TESTS).toFixed(2)} ms`);

