import Queue from "../src/2_WFC/1_Model/Queue_LinkedList";
import BigBitmask from "../src/2_WFC/1_Model/BigBitmask";

const NUM_PROPAGATIONS = 500;     // how many times propagate() is called
const NUM_SUB_PROPAGATIONS = 500; // number of times propagate() adjusts a cell
const NUM_PATTERNS = 500;

const queue_Array = [];
const queue_LinkedList = new Queue();

const mask = new BigBitmask(NUM_PATTERNS);
for (let i = 0; i < NUM_PATTERNS; i++) {
    mask.setBit(Math.random() * NUM_PATTERNS)
}

let start;
let end;
let duration;

start = performance.now();
for (let i = 0; i < NUM_PROPAGATIONS; i++) {

    for (let j = 0; j < NUM_SUB_PROPAGATIONS; j++) {
    const element = new BigBitmask(NUM_PATTERNS);
    for (let k = 0; k < NUM_PATTERNS; k++) {
        element.setBit(Math.random() * NUM_PATTERNS)
    }

    queue_Array.push(element);
    }

    for (let j = 0; j < NUM_SUB_PROPAGATIONS; j++) {
    const element = queue_Array.shift();

    element.intersectWith(mask);
    }
}
end = performance.now();
duration = end - start;
console.log("queue_Array: " + duration);

start = performance.now();
for (let i = 0; i < NUM_PROPAGATIONS; i++) {
    
    for (let j = 0; j < NUM_SUB_PROPAGATIONS; j++) {
    const element = new BigBitmask(NUM_PATTERNS);
    for (let k = 0; k < NUM_PATTERNS; k++) {
        element.setBit(Math.random() * NUM_PATTERNS)
    }

    queue_LinkedList.enqueue(element);
    }

    for (let j = 0; j < NUM_SUB_PROPAGATIONS; j++) {
    const element = queue_LinkedList.dequeue();
    
    element.intersectWith(mask);
    }
}
end = performance.now();
duration = end - start;
console.log("queue_LinkedList: " + duration);
