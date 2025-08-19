// uses code from: 
// https://github.com/Rxlling-Pxly/CMPM-118-Natural-Language-Procedural-Generation-with-Constraints

const DIRECTIONS = [
    { x: 0, y: -1 }, // up
    { x: 0, y: 1 },  // down
    { x: -1, y: 0 }, // left
    { x: 1, y: 0 }   // right
];

export default class Layout{
    constructor(mapData, minStructureSize, structureTypes){
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

        // Populate layout data
        for (const structureType in this.structureTypes) {
            let structureConfig = this.structureTypes[structureType];
            for (const [index, positionArray] of this.getStructures(structureConfig.tileIDs).entries()) {
                let structureFacts = this.getStructureFacts(structureType, positionArray);
                this.worldFacts.push(structureFacts);
                
                if(structureConfig.regionType === "trace"){ 
                    for(let {x, y} of positionArray){
                        this.layoutMap[y][x] = structureConfig.color;
                    }
                } else {
                    let startX = structureFacts.boundingBox.topLeft.x;
                    let startY = structureFacts.boundingBox.topLeft.y;

                    let w = startX + structureFacts.boundingBox.width;
                    let h = startY + structureFacts.boundingBox.height;
                    
                    console.log(structureType, startX, startY, w, h)

                    for(let x = startX; x < w; x++){
                        for(let y = startY; y < h; y++){
                            this.layoutMap[y][x] = structureConfig.color;
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
                if (structure.length > this.minStructureSize) {
                    structures.push(structure);
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
}