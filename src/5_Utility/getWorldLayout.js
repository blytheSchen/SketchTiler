// uses code from: 
// https://github.com/Rxlling-Pxly/CMPM-118-Natural-Language-Procedural-Generation-with-Constraints

const COLORS = {
    RED: "#f54242",
    YELLOW: "#f5c842",
    GREEN: "#009632",
    BLUE: "#0000ff",
    GREY: "#525252",
    BLACK: "#000000"
};
const DIRECTIONS = [
    { x: 0, y: -1 }, // up
    { x: 0, y: 1 },  // down
    { x: -1, y: 0 }, // left
    { x: 1, y: 0 }   // right
];

const MIN_STRUCTURE_SIZE = 2;
const STRUCTURE_TYPES = {
   house: {
        color: COLORS.RED,
        regionType: "box",
        tileIDs: [
            49, 50, 51, 52, 53, 54, 55, 56,
            61, 62, 63, 64, 65, 66, 67, 68,
            73, 74, 75, 76, 77, 78, 79, 80,
            85, 86, 87, 88, 89, 90, 91, 92
        ],
   },
   fence: {
        regionType: "trace",
        color: COLORS.YELLOW,
        tileIDs: [
            45, 46, 47, 48, 
            57, 59, 60, 
            69, 70, 71, 72, 
            81, 82, 83
        ]
   },
   forest: {
        regionType: "box",
        color: COLORS.GREEN,
        tileIDs: [
            4, 5, 7, 8, 9, 10, 11, 12,
            16, 17, 18, 19, 20, 21, 22, 23, 24, 
            28, 29, 30, 31, 32, 33, 34, 35, 36,
            107, 95
        ],
    },
    path: {
        color: COLORS.BLUE,
        regionType: "trace",
        tileIDs: [
            40, 41, 42, 43, 44
       ],
    }
};

export default function getWorldFacts(mapData, structureTypes = STRUCTURE_TYPES) {
    if(mapData.layers){
        mapData = createSingleLayerMap(mapData.layers);
    }
    
    // Initialize
    let structures = [];

    // Populate
    for (const typeName in structureTypes) {
        let structureConfig = structureTypes[typeName];
        for (const [index, positionArray] of getStructures(mapData, structureConfig.tileIDs).entries()) {
            const structure = {
                type: typeName,
                boundingBox: getBoundingBox(positionArray),
                color: structureConfig.color
            };

            if(structureConfig.regionType === "trace") structure.trace = positionArray;
            structures.push(structure);
        }
    }

    return structures;
}

function getBoundingBox(structure) {
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

function getStructures(mapData, structureTiles) {
    // visitedTiles = a copy of mapData where each elem is a bool initialized to false
    const visitedTiles = Array.from({ length: mapData.length }, () => Array(mapData[0].length).fill(false));
    const structures = [];

    for (let y = 0; y < mapData.length; y++) {
        for (let x = 0; x < mapData[0].length; x++) {
            
            // Skip if empty or already visited tiles
            if (mapData[y][x] === -1 || visitedTiles[y][x]) continue;

            // Flood fill to find connected structure
            const structure = floodFill(mapData, x, y, visitedTiles, structureTiles);
            
            // Store structure if it meets criteria
            if (structure.length > MIN_STRUCTURE_SIZE) {
                structures.push(structure);
            }
        }
    }

    return structures;
}

function floodFill(mapData, startX, startY, visitedTiles, structureTiles) {
    const structure = [];
    const stack = [{ x: startX, y: startY }];

    while (stack.length > 0) {
        const { x, y } = stack.pop();

        // Skip if:
        if (
            x < 0 || y < 0 || x >= mapData[0].length || y >= mapData.length || 	// out of bounds
            visitedTiles[y][x] ||												// already visited tile
            structureTiles.findIndex((elem) => elem === mapData[y][x]) === -1	// tile is not a structure tile
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

function createSingleLayerMap(mapsArray) {
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