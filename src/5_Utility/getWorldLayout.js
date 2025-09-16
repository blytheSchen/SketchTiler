// uses code from: 
// https://github.com/Rxlling-Pxly/CMPM-118-Natural-Language-Procedural-Generation-with-Constraints

const DIRECTIONS = [
    { x: 0, y: -1 }, // up
    { x: 0, y: 1 },  // down
    { x: -1, y: 0 }, // left
    { x: 1, y: 0 }   // right
];

export default class Layout{
    constructor(mapData, minStructureSize, structureTypes, preventOverlaps = false){
        // input 
        this.mapData = mapData;
        if(this.mapData.layers){
            this.mapData = this.createSingleLayerMap(this.mapData.layers);
        }
        this.minStructureSize = minStructureSize;
        this.structureTypes = structureTypes;

        // init this.layoutMap with empty tiles
        this.layoutMap = Array.from({ length: this.mapData.length }, () => Array(this.mapData[0].length).fill(0));
        this.worldFacts = [];

        // find all structures
        for (const structureType in this.structureTypes) {
            let structureConfig = this.structureTypes[structureType];

            let s = this.getStructures(structureConfig.tileIDs);
            
            for(let positionArray of s){
                let structureFacts = this.getStructureFacts(structureType, positionArray);
                this.worldFacts.push(structureFacts);
            }
        }

        // adjust disallowed overlaps
        if(preventOverlaps)(this.overlapHandler());

        // Populate layout data
        for (let structure of this.worldFacts) {
            if(structure.trace){ 
                for(let {x, y} of positionArray){
                    this.layoutMap[y][x] = structure.color;
                }
            } else {
                let startX = structure.boundingBox.topLeft.x;
                let startY = structure.boundingBox.topLeft.y;

                let w = startX + structure.boundingBox.width;
                let h = startY + structure.boundingBox.height;
                
                for(let x = startX; x < w; x++){
                    for(let y = startY; y < h; y++){
                        let corner = this.isCorner(x, y, structure.boundingBox);
                        let border = this.isBorder(x, y, structure.boundingBox);

                        if(corner < 0 && border < 0) { 
                            // color fill tiles
                            this.layoutMap[y][x] = structure.color;
                            
                        } else {
                            // color border and corner tiles
                            if(border != -1){    
                                this.layoutMap[y][x] = (this.structureTypes[structure.type].borders) ? 
                                    this.structureTypes[structure.type].borders[border] : structure.color;
                            }
                            if(corner != -1 ) {  
                                this.layoutMap[y][x] = (this.structureTypes[structure.type].corners) ? 
                                    this.structureTypes[structure.type].corners[corner] : structure.color;
                            }
                        }
                    }
                }
            }
        }
    }

    getWorldFacts() {
        return this.worldFacts;
    }   

    getLayoutMap(){
        return this.layoutMap;
    }

    getStructureFacts(structureType, positionArray){
        // Populate this.worldFacts array with map data
        let structureConfig = this.structureTypes[structureType];

        const structureFacts = {
            type: structureType,
            boundingBox: this.getBoundingBox(positionArray),
            color: structureConfig.color
        };

        if(structureConfig.regionType === "trace"){ 
            structureFacts.trace = positionArray;
        }

        return structureFacts;
    }

    getBoundingBox(structure) {
        let minX = structure[0].x;
        let maxX = structure[0].x;
        let minY = structure[0].y;
        let maxY = structure[0].y;

        for (const { x, y } of structure) {
            if (x < minX) minX = x;
            else if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            else if (y > maxY) maxY = y;
        }

        return {
            topLeft: { x: minX, y: minY },
            width: 1 + maxX - minX,
            height: 1 + maxY - minY
        };
    }

    getStructures(structureTiles) {
        // visitedTiles = a copy of mapData where each elem is a bool initialized to false
        const visitedTiles = Array.from({ length: this.mapData.length }, () => Array(this.mapData[0].length).fill(false));
        const structures = [];

        for (let y = 0; y < this.mapData.length; y++) {
            for (let x = 0; x < this.mapData[0].length; x++) {
                
                // Skip if empty or already visited tiles
                if (this.mapData[y][x] === -1 || visitedTiles[y][x]) continue;

                // Flood fill to find connected structure
                const structure = this.floodFill(x, y, visitedTiles, structureTiles);
                
                // Store structure if it meets criteria
                if (structure.length > 0) {
                    let box = this.getBoundingBox(structure);
                    if(box.width > this.minStructureSize && box.height > this.minStructureSize) {
                        structures.push(structure);
                    }
                }
            }
        }

        return structures;
    }

    floodFill(startX, startY, visitedTiles, structureTiles) {
        const structure = [];
        const stack = [{ x: startX, y: startY }];

        while (stack.length > 0) {
            const { x, y } = stack.pop();

            // Skip if:
            if (
                x < 0 || y < 0 || x >= this.mapData[0].length || y >= this.mapData.length || 	// out of bounds
                visitedTiles[y][x] ||												// already visited tile
                structureTiles.findIndex((elem) => elem === this.mapData[y][x]) === -1	// tile is not a structure tile
            ) {
                continue;
            }

            // Mark as visited and add to structure
            visitedTiles[y][x] = true;
            structure.push({ x, y });

            // Add neighbors to stack
            for (const dir of DIRECTIONS) {
                stack.push({ x: x + dir.x, y: y + dir.y });
            }
        }

        return structure;
    }

    createSingleLayerMap(mapsArray) {
        let height = mapsArray[0].tilemap.height;
        let width = mapsArray[0].tilemap.width;

        // Initialize data
        let singleLayerMapData = [];
        for (let y = 0; y < height; y++) {
            singleLayerMapData[y] = [];
        }

        // Populate data
        // note: mapsArray should include layers in order of ascending priority
        // (aka highest z-index should be the last element in the array)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                for(let map of mapsArray){
                    if (map.layer.data[y][x].index > 0) {
                        singleLayerMapData[y][x] = map.layer.data[y][x].index;
                    }
                }
            }
        }

        return singleLayerMapData;
    }

    isCorner(x, y, box){
        if(x === box.topLeft.x){
            if(y === box.topLeft.y)                 return 0;    // topleft
            if(y === box.topLeft.y + box.height-1)  return 3;    // bottomleft
        }
        if(y === box.topLeft.y){
            if(x === box.topLeft.x + box.width-1)   return 1;    // topright
        }
        if( x === box.topLeft.x + box.width-1 &&
            y === box.topLeft.y + box.height-1)     return 2;    // bottomright
        
        return -1;
    }

    isBorder(x, y, box){
        if(y === box.topLeft.y)                 return 0;   // top
        if(x === box.topLeft.x + box.width-1)   return 1;   // right
        if(y === box.topLeft.y + box.height-1)  return 2;   // bottom
        if(x === box.topLeft.x)                 return 3;   // left
        
        return -1;
    }

    // adjust regions in world facts if overlap detected
    overlapHandler(){
        // sort structures by priority (higher priority values take precedence)
        this.worldFacts.sort((a, b) => {
            const priorityA = this.structureTypes[a.type].priority || 0;
            const priorityB = this.structureTypes[b.type].priority || 0;
            return priorityB - priorityA; // Sort in descending order of priority
        });

        for(let i = 0; i < this.worldFacts.length; i++){
            let currentStructure = this.worldFacts[i];
            let currentPriority = this.structureTypes[currentStructure.type].priority || 0;

            // prevent structures from overlapping higher priority structures
            for(let j = 0; j < i; j++){
                let higherPriorityStructure = this.worldFacts[j];
                let higherPriority = this.structureTypes[higherPriorityStructure.type].priority || 0;
                
                // skip if current structure higher priority
                if(currentPriority > higherPriority) continue;
                
                // check for overlap
                if(this.isOverlapping(currentStructure.boundingBox, higherPriorityStructure.boundingBox)){
                    // handle overlap based on structure type
                    if(currentStructure.trace){ // TRACE
                        // remove overlapping positions
                        currentStructure.trace = currentStructure.trace.filter(pos => 
                            !this.positionInStructure(pos, higherPriorityStructure)
                        );
                        
                        // update bounding box 
                        if(currentStructure.trace.length > 0){
                            currentStructure.boundingBox = this.getBoundingBox(currentStructure.trace);
                        } else {
                            currentStructure.isEmpty = true;
                        }
                    } else {    // BOX
                        // adjust bounding box to avoid overlap
                        currentStructure.boundingBox = this.adjustBoundingBoxForOverlap(
                            currentStructure.boundingBox, 
                            higherPriorityStructure.boundingBox
                        );
                        
                        if(currentStructure.boundingBox.width <= 0 || currentStructure.boundingBox.height <= 0){
                            currentStructure.isEmpty = true;
                        }
                    }
                }
            }
        }
        
        // remove structures that became empty after overlap handling
        this.worldFacts = this.worldFacts.filter(structure => !structure.isEmpty);
    }

    // check if two bounding boxes overlap
    isOverlapping(box1, box2) {
        return !(box1.topLeft.x + box1.width <= box2.topLeft.x ||
                box2.topLeft.x + box2.width <= box1.topLeft.x ||
                box1.topLeft.y + box1.height <= box2.topLeft.y ||
                box2.topLeft.y + box2.height <= box1.topLeft.y
            );
    }

    // check if a position is within a structure
    positionInStructure(position, structure) {
        if(structure.trace) {
            return structure.trace.some(tracePos => 
                tracePos.x === position.x && tracePos.y === position.y
            );
        } else {
            return position.x >= structure.boundingBox.topLeft.x &&
                position.x < structure.boundingBox.topLeft.x + structure.boundingBox.width &&
                position.y >= structure.boundingBox.topLeft.y &&
                position.y < structure.boundingBox.topLeft.y + structure.boundingBox.height;
        }
    }

    // shrinks current bounding box to avoid overlap with higher priority box
    adjustBoundingBoxForOverlap(currentBox, higherPriorityBox) {
        let newBox = {
            topLeft: { ...currentBox.topLeft },
            width: currentBox.width,
            height: currentBox.height
        };
        
        // if current box starts inside the higher priority box, move it
        if(currentBox.topLeft.x < higherPriorityBox.topLeft.x + higherPriorityBox.width &&
        currentBox.topLeft.y < higherPriorityBox.topLeft.y + higherPriorityBox.height) {
            
            // try to move to the right of the higher priority box
            let rightEdge = higherPriorityBox.topLeft.x + higherPriorityBox.width;
            if(rightEdge < currentBox.topLeft.x + currentBox.width) {
                newBox.topLeft.x = rightEdge;
                newBox.width = Math.max(0, currentBox.topLeft.x + currentBox.width - rightEdge);
            } else {
                // try to move below the higher priority box
                let bottomEdge = higherPriorityBox.topLeft.y + higherPriorityBox.height;
                if(bottomEdge < currentBox.topLeft.y + currentBox.height) {
                    newBox.topLeft.y = bottomEdge;
                    newBox.height = Math.max(0, currentBox.topLeft.y + currentBox.height - bottomEdge);
                } else {
                    // no room to adjust --> mark for removal
                    newBox.width = 0;
                    newBox.height = 0;
                }
            }
        }
        
        return newBox;
    }
}