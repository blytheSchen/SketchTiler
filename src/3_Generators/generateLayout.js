import WFCModel from "../2_WFC/1_Model/wfcModel.js";
import IMAGES from "../2_WFC/2_Input/images.js";
import TILEMAP from "../4_Phaser/tilemap.js";
import Layout from "../5_Utility/getWorldLayout.js";
import STRUCTURE_TILES from "../4_Phaser/structureTiles.js";

const colortiles = TILEMAP["color_tiles"];
const tilesetInfo = TILEMAP["tiny_town"];

/**
 * @param {BoundingBox} regions
 * @returns {TilemapImage}
 */
export default function generateLayout(regions, detectStructuresID, placeStructuresID, minStructreSize, preventOverlaps = false) {
    const layouts = learnLayout(detectStructuresID, placeStructuresID, minStructreSize, preventOverlaps);
    const model = new WFCModel().learn(layouts, 2);
    
    for(let type in regions){
        for(let box of regions[type]){
            placeStructureInLayout(type.toLowerCase(), box, model);
        }
    }
    
    // generate layout
    const map = model.generate(tilesetInfo.WIDTH, tilesetInfo.HEIGHT, 10, false, false);

    if (!map){ 
        console.error("Contradiction created");
        return false;
    }

    const layout = new Layout(
        map,
        minStructreSize, 
        STRUCTURE_TILES[placeStructuresID],
        STRUCTURE_TILES[placeStructuresID],
        minStructreSize,
        preventOverlaps
    );

    return layout;
}

/**
 * Train layout model on structure layouts.
 * 
 * @param {string} detectStructuresID - Key for STRUCTURE_TILES to use.
 */
function learnLayout(detectStructuresID, placeStructuresID, minStructreSize, preventOverlaps){
    let layouts = []

    // create layouts from structure maps
    for(let structureMap of IMAGES.STRUCTURES){
        const mapLayout = new Layout(
            structureMap,
            minStructreSize, 
            STRUCTURE_TILES[detectStructuresID],
            STRUCTURE_TILES[placeStructuresID],
            preventOverlaps
        );

        layouts.push(mapLayout.getLayoutMap());
    }

    return layouts;
}

function placeStructureInLayout(type, boundingBox, model){
    const tlX = boundingBox.topLeft.x;
    const tlY = boundingBox.topLeft.y;
    const brX = boundingBox.bottomRight.x;
    const brY = boundingBox.bottomRight.y;

    const w = boundingBox.width;
    const h = boundingBox.height;

    // place corners
    model.setTile(tlX, tlY, colortiles[type].TOP_LEFT);
    model.setTile(brX, tlY, colortiles[type].TOP_RIGHT);
    model.setTile(tlX, brY, colortiles[type].BOTTOM_LEFT);
    model.setTile(brX, brY, colortiles[type].BOTTOM_RIGHT);

    // place borders
    // top and bottom
    for (let x = tlX + 1; x < brX; x++) {
        model.setTile(x, tlY, colortiles[type].TOP);
        model.setTile(x, brY, colortiles[type].BOTTOM);
    }

    // left and right
    for (let y = tlY + 1; y < brY; y++) {
        model.setTile(tlX, y, colortiles[type].LEFT);
        model.setTile(brX, y, colortiles[type].RIGHT);
    }
}