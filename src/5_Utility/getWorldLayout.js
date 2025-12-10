// uses code from: 
// https://github.com/Rxlling-Pxly/CMPM-118-Natural-Language-Procedural-Generation-with-Constraints

const DIRECTIONS = [
    { x: 0, y: -1 }, // up
    { x: 0, y: 1 },  // down
    { x: -1, y: 0 }, // left
    { x: 1, y: 0 }   // right
];

export default class Layout{
    constructor(mapData, minStructureSize, detectStructureTypes, placeStructureTypes, preventOverlaps = false){
        // input 
        this.mapData = mapData;
        if(this.mapData.layers){
            this.mapData = this.createSingleLayerMap(this.mapData.layers);
        }
        this.minStructureSize = minStructureSize;
        this.detectStructureTypes = detectStructureTypes;
        this.placeStructureTypes = placeStructureTypes;

        // init this.layoutMap with empty tiles
        this.layoutMap = Array.from({ length: this.mapData.length }, () => Array(this.mapData[0].length).fill(0));
        this.worldFacts = [];

        this.findStructures(this.detectStructureTypes);

        // adjust disallowed overlaps
        if(preventOverlaps)(this.overlapHandler());

        // Populate layout data
        this.initLayout();
        this.findVoids();
    }

    findStructures(detect){
        console.log(detect)
        // find all structures
        for (const structureType in detect) {
            let structureConfig = detect[structureType];

            let s = this.getStructures(structureConfig);
            
            for(let positionArray of s){
                let structureFacts = this.getStructureFacts(structureType, positionArray);
                this.worldFacts.push(structureFacts);
            }
        }
    }

    // Most of my modifications are in this function
    initLayout(){
        // Pretty sure this is right 
        const TILE_SIZE = 16;
        for (let structure of this.worldFacts) {
            if (structure.trace) {
                for (let { x, y } of structure.trace) {
                    this.layoutMap[y][x] = structure.color;
                }
            } else {
                let startX = structure.boundingBox.topLeft.x;
                let startY = structure.boundingBox.topLeft.y;

                let w = startX + structure.boundingBox.width;
                let h = startY + structure.boundingBox.height;
                
                for(let x = startX; x < w; x++){
                    for(let y = startY; y < h; y++){
                        // Triangle logic
                        if (window.generatedTriangles && window.generatedTriangles.length > 0) {
                            
                            // 1. Calculate the center pixel of this grid cell
                            const pixelX = (x * TILE_SIZE) + (TILE_SIZE / 2);
                            const pixelY = (y * TILE_SIZE) + (TILE_SIZE / 2);

                            let isInsideAnyTriangle = false;

                            // 2. Check if this pixel is inside ANY of the red triangles
                            for (const tri of window.generatedTriangles) {
                                if (pointInTriangle(pixelX, pixelY, 
                                    tri[0].x, tri[0].y, 
                                    tri[1].x, tri[1].y, 
                                    tri[2].x, tri[2].y)) {
                                    isInsideAnyTriangle = true;
                                    break;
                                }
                            }

                            // 3. If it's not inside the L-shape, SKIP IT (leave it empty)
                            if (!isInsideAnyTriangle) {
                                continue; 
                            }
                        }
                        
                        let corner = this.getCorner(x, y, structure.boundingBox);
                        let border = this.getBorder(x, y, structure.boundingBox);

                        if(!corner && !border) { 
                            // color fill tiles
                            this.layoutMap[y][x] = structure.color;
                            
                        } else {
                            // color border and corner tiles
                            if(border){    
                                this.layoutMap[y][x] = (this.placeStructureTypes[structure.type].borders) ? 
                                    this.placeStructureTypes[structure.type].borders[border][0] : structure.color;
                            }
                            if(corner) {  
                                this.layoutMap[y][x] = (this.placeStructureTypes[structure.type].corners) ? 
                                    this.placeStructureTypes[structure.type].corners[corner][0] : structure.color;
                            }
                        }
                    }
                }
            }
        }
    }

    findVoids(){
        // kind of a second layout-parsing pass
        // look at this.layoutMap and look for Nothing (0)
        // split voids into rectangles without overlapping
        console.log(this.layoutMap)
    }

    getWorldFacts() {
        return this.worldFacts;
    }   

    getLayoutMap(){
        return this.layoutMap;
    }

    getStructureFacts(structureType, positionArray){
        // Populate this.worldFacts array with map data
        let structureConfig = this.detectStructureTypes[structureType];

        const structureFacts = {
            type: structureType,
            boundingBox: this.getBoundingBox(positionArray),
            color: structureConfig.color,
            tiles: positionArray
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

    getStructures(structure) {
        // visitedTiles = a copy of mapData where each elem is a bool initialized to false
        const visitedTiles = Array.from({ length: this.mapData.length }, () => Array(this.mapData[0].length).fill(false));
        const structures = [];

        const structureTiles = structure.tileIDs;

        for (let y = 0; y < this.mapData.length; y++) {
            for (let x = 0; x < this.mapData[0].length; x++) {
                
                // Skip if empty or already visited tiles
                if (this.mapData[y][x] === -1 || visitedTiles[y][x]) continue;

                // Flood fill to find connected structure
                const found = this.floodFill(x, y, visitedTiles, structure);
                
                // Store structure if it meets criteria
                if (found.length > 0) {
                    let box = this.getBoundingBox(found);
                    if(box.width > this.minStructureSize && box.height > this.minStructureSize) {
                        structures.push(found);
                    }
                }
            }
        }

        return structures;
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

    getCorner(x, y, box){
        if(x === box.topLeft.x){
            if(y === box.topLeft.y)                 return "topleft";    
            if(y === box.topLeft.y + box.height-1)  return "bottomleft";
        }
        if(y === box.topLeft.y){
            if(x === box.topLeft.x + box.width-1)   return "topright";
        }
        if( x === box.topLeft.x + box.width-1 &&
            y === box.topLeft.y + box.height-1)     return "bottomright";
        
        return null;
    }

    getBorder(x, y, box){
        if(y === box.topLeft.y)                 return "top";
        if(x === box.topLeft.x + box.width-1)   return "right";
        if(y === box.topLeft.y + box.height-1)  return "bottom";
        if(x === box.topLeft.x)                 return "left";
        
        return null;
    }

    getBorderFromTile(tileID, structure){
        for(let b in structure.borders){
            let bordersTiles = structure.borders[b]
            if(bordersTiles.findIndex((elem) => elem === tileID) !== -1){
                return b;
            }
        }

        return false;
    }

    getCornerFromTile(tileID, structure) {
        if (!structure.corners) return null;
        
        for (let c in structure.corners) {
            let cornerTiles = structure.corners[c];
            if (cornerTiles.findIndex((elem) => elem === tileID) !== -1) {
                return c;
            }
        }
        return null;
    }

    // adjust regions in world facts if overlap detected
    overlapHandler(){
        // sort structures by priority (higher priority values take precedence)
        this.worldFacts.sort((a, b) => {
            const priorityA = this.detectStructureTypes[a.type].priority || 0;
            const priorityB = this.detectStructureTypes[b.type].priority || 0;
            return priorityB - priorityA; // Sort in descending order of priority
        });

        for(let i = 0; i < this.worldFacts.length; i++){
            let currentStructure = this.worldFacts[i];
            let currentPriority = this.detectStructureTypes[currentStructure.type].priority || 0;

            // prevent structures from overlapping higher priority structures
            for(let j = 0; j < i; j++){
                let higherPriorityStructure = this.worldFacts[j];
                let higherPriority = this.detectStructureTypes[higherPriorityStructure.type].priority || 0;
                
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

    floodFill(startX, startY, visitedTiles, structure) {
        const positionArray = [];

        const edgePositions = {
            top: [],
            right: [],
            bottom: [],
            left: [],
        };

        const cornerPositions = {
            topleft: [],
            topright: [],
            bottomright: [],
            bottomleft: []
        };

        const stack = [{ x: startX, y: startY }];

        const structureTiles = structure.tileIDs;

        while (stack.length > 0) {
            const { x, y } = stack.pop();

            // Skip if:
            if (
                x < 0 || y < 0 || x >= this.mapData[0].length || y >= this.mapData.length || 	// out of bounds
                visitedTiles[y][x] ||												            // already visited tile
                structureTiles.findIndex((elem) => elem === this.mapData[y][x]) === -1          // tile is not a structure tile
            ) {
                continue;
            }

            // check if it's a corner tile
            const corner = this.getCornerFromTile(this.mapData[y][x], structure);
            if (corner) {
                if (this.hasCornerConflict(x, y, corner, cornerPositions, edgePositions)) {
                    continue;
                }
                cornerPositions[corner].push({ x, y });
            }

            // check if it's an edge tile (corner or border)
            const edge = this.getBorderFromTile(this.mapData[y][x], structure);
            if (edge) {
                // tile belongs to separate structure, don't include it
                if (this.hasBorderConflict(x, y, edge, edgePositions, cornerPositions)) { 
                    continue; 
                }
                edgePositions[edge].push({ x, y });
            }

            // if it's a fill tile, make sure it doesn't conflict with edge/corner tiles
            if(!corner && !edge){
                if(this.illegalFill(x, y, cornerPositions)) continue;
            }

            // Mark as visited and add to structure
            visitedTiles[y][x] = true;
            positionArray.push({ x, y });

            // Add neighbors to stack
            let allowedDirs = DIRECTIONS; // default

            if (corner) {
                switch (corner) {
                    case "topleft":
                        allowedDirs = DIRECTIONS.filter(d => !(d.x === -1 || d.y === -1));
                        break;
                    case "topright":
                        allowedDirs = DIRECTIONS.filter(d => !(d.x === 1 || d.y === -1));
                        break;
                    case "bottomright":
                        allowedDirs = DIRECTIONS.filter(d => !(d.x === 1 || d.y === 1));
                        break;
                    case "bottomleft":
                        allowedDirs = DIRECTIONS.filter(d => !(d.x === -1 || d.y === 1));
                        break;
                }
            } else if (edge) {
                switch (edge) {
                    case "top":
                        allowedDirs = DIRECTIONS.filter(d => d.y !== -1);
                        break;
                    case "bottom":
                        allowedDirs = DIRECTIONS.filter(d => d.y !== 1);
                        break;
                    case "left":
                        allowedDirs = DIRECTIONS.filter(d => d.x !== -1);
                        break;
                    case "right":
                        allowedDirs = DIRECTIONS.filter(d => d.x !== 1);
                        break;
                }
            }

            // Now only push valid directions
            for (const dir of allowedDirs) {
                stack.push({ x: x + dir.x, y: y + dir.y });
            }

        }

        return positionArray;
    }

    // checks for conflicting border relationships
    hasBorderConflict(x, y, currentEdge, edgePositions, cornerPositions) {
        if(edgePositions[currentEdge].length === 0) return false;

        switch (currentEdge) {
            case 'top':
                // top edge shouldn't have a bottom edge/corner to its north
                if(edgePositions.bottom.some(pos => pos.y < y)) return true;
                if(cornerPositions.bottomleft.some(pos => pos.y < y)) return true;
                if(cornerPositions.bottomright.some(pos => pos.y < y)) return true;

                // top edge should not extend past left or right edges
                if(edgePositions.left.length > 0 && x < edgePositions.left[0].x) return true;
                if(edgePositions.right.length > 0 && x > edgePositions.right[0].x) return true;

                // top edge should only have one y value
                if(y !== edgePositions.top[0].y) return true;
                break;
            case 'bottom':
                // bottom edge shouldn't have a top edge/corner to its south
                if(edgePositions.top.some(pos => pos.y > y)) return true;
                if(cornerPositions.topleft.some(pos => pos.y > y)) return true;
                if(cornerPositions.topright.some(pos => pos.y > y)) return true;

                // bottom edge should not extend past left or right edges
                if(edgePositions.left.length > 0 && x < edgePositions.left[0].x) return true;
                if(edgePositions.right.length > 0 && x > edgePositions.right[0].x) return true;

                // bottom edge should only have one y value
                if(y !== edgePositions.bottom[0].y) return true;
                break;
            case 'left':
                // left edge shouldn't have a right edge/corner to its west
                if(edgePositions.right.some(pos => pos.x < x)) return true;
                if(cornerPositions.topright.some(pos => pos.x < x)) return true;
                if(cornerPositions.bottomright.some(pos => pos.x < x)) return true;


                // left edge should not extend past top or bottom edges
                if(edgePositions.top.length > 0 && y < edgePositions.top[0].y) return true;
                if(edgePositions.bottom.length > 0 && y > edgePositions.bottom[0].y) return true;

                // left edge should only have one x value
                if(x !== edgePositions.left[0].x) return true;
                break;
            case 'right':
                // right edge shouldn't have a left edge/corner to its east
                if(edgePositions.left.some(pos => pos.x > x)) return true;
                if(cornerPositions.topleft.some(pos => pos.x > x)) return true;
                if(cornerPositions.bottomleft.some(pos => pos.x > x)) return true;

                // right edge should not extend past top or bottom edges
                if(edgePositions.top.length > 0 && y < edgePositions.top[0].y) return true;
                if(edgePositions.bottom.length > 0 && y > edgePositions.bottom[0].y) return true;

                // right edge should only have one x value
                if(x !== edgePositions.right[0].x) return true;
                break;
        }

        return false;
    }

    // check for corner conflicts
    hasCornerConflict(x, y, currentCorner, cornerPositions, edgePositions) {
        // Each corner type should only appear once
        if (cornerPositions[currentCorner].length > 0) {
            return true;
        }
        
        // Check spatial relationships between corners and edges
        switch (currentCorner) {
            case 'topleft':
                // Should be at intersection of top and left edges
                if (edgePositions.top.length > 0 && y !== edgePositions.top[0].y) return true;
                if (edgePositions.left.length > 0 && x !== edgePositions.left[0].x) return true;
                break;
            case 'topright':
                // Should be at intersection of top and right edges
                if (edgePositions.top.length > 0 && y !== edgePositions.top[0].y) return true;
                if (edgePositions.right.length > 0 && x !== edgePositions.right[0].x) return true;
                break;
            case 'bottomright':
                // Should be at intersection of bottom and right edges
                if (edgePositions.bottom.length > 0 && y !== edgePositions.bottom[0].y) return true;
                if (edgePositions.right.length > 0 && x !== edgePositions.right[0].x) return true;
                break;
            case 'bottomleft':
                // Should be at intersection of bottom and left edges
                if (edgePositions.bottom.length > 0 && y !== edgePositions.bottom[0].y) return true;
                if (edgePositions.left.length > 0 && x !== edgePositions.left[0].x) return true;
                break;
        }
        
        return false;
    }

    // check for fill conflicts
    illegalFill(x, y, cornerPositions){
        for(let c in cornerPositions){
            let corner = cornerPositions[c];

            switch (corner) {
                case 'topleft':
                    if(x <= corner.x) return true;
                    if(y <= corner.y) return true;
                    break;
                case 'topright':
                    if(x >= corner.x) return true;
                    if(y <= corner.y) return true;
                    break;
                case 'bottomright':
                    if(x >= corner.x) return true;
                    if(y >= corner.y) return true;
                    break;
                case 'bottomleft':
                    if(x <= corner.x) return true;
                    if(y >= corner.y) return true;
                    break;
            }

        }

        return false;
    }

    // validate rectangle consistency
    isValidRectangle(edgePositions, cornerPositions) {
        // Check that we don't have conflicting corner arrangements
        const corners = Object.keys(cornerPositions).filter(corner => cornerPositions[corner].length > 0);
        
        if (corners.length >= 2) {
            // If we have both topleft and bottomright, they should form a valid diagonal
            if (cornerPositions.topleft.length > 0 && cornerPositions.bottomright.length > 0) {
                const tl = cornerPositions.topleft[0];
                const br = cornerPositions.bottomright[0];
                if (tl.x >= br.x || tl.y >= br.y) return false;
            }
            
            // If we have both topright and bottomleft, they should form a valid diagonal
            if (cornerPositions.topright.length > 0 && cornerPositions.bottomleft.length > 0) {
                const tr = cornerPositions.topright[0];
                const bl = cornerPositions.bottomleft[0];
                if (tr.x <= bl.x || tr.y >= bl.y) return false;
            }
            
            // Check that corners on the same edge align properly
            if (cornerPositions.topleft.length > 0 && cornerPositions.topright.length > 0) {
                if (cornerPositions.topleft[0].y !== cornerPositions.topright[0].y) return false;
            }
            if (cornerPositions.bottomleft.length > 0 && cornerPositions.bottomright.length > 0) {
                if (cornerPositions.bottomleft[0].y !== cornerPositions.bottomright[0].y) return false;
            }
            if (cornerPositions.topleft.length > 0 && cornerPositions.bottomleft.length > 0) {
                if (cornerPositions.topleft[0].x !== cornerPositions.bottomleft[0].x) return false;
            }
            if (cornerPositions.topright.length > 0 && cornerPositions.bottomright.length > 0) {
                if (cornerPositions.topright[0].x !== cornerPositions.bottomright[0].x) return false;
            }
        }
        
        return true;
    }
    /**
     * Checks if point (x, y) is inside the polygon points.
     * @param {number} x - The grid x coordinate
     * @param {number} y - The grid y coordinate
     * @param {Array} vertices - Array of {x, y} points defining the shape
     */
    isPointInPolygon(x, y, vertices) {
        let inside = false;
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
            const xi = vertices[i].x, yi = vertices[i].y;
            const xj = vertices[j].x, yj = vertices[j].y;
            
            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                
            if (intersect) inside = !inside;
        }
        return inside;
    }
}

function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
    const v0x = cx - ax, v0y = cy - ay;
    const v1x = bx - ax, v1y = by - ay;
    const v2x = px - ax, v2y = py - ay;

    const dot00 = v0x * v0x + v0y * v0y;
    const dot01 = v0x * v1x + v0y * v1y;
    const dot02 = v0x * v2x + v0y * v2y;
    const dot11 = v1x * v1x + v1y * v1y;
    const dot12 = v1x * v2x + v1y * v2y;

    const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
    const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

    return (u >= 0) && (v >= 0) && (u + v < 1);
}