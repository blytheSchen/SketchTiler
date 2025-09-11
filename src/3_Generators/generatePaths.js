import WFCModel from "../2_WFC/1_Model/wfcModel.js";
import IMAGES from "../2_WFC/2_Input/images.js";
import TILEMAP from "../4_Phaser/TILEMAP.js";

const model = new WFCModel().learn(IMAGES.GROUND, 2);
const tinytown = TILEMAP["tiny_town"];

/**
 * @param {BoundingBox} boundingBox
 * @returns {TilemapImage}
 */
export default function generatePaths(boundingBox) {
  model.clearSetTiles();

  // generate paths
  const paths = model.generate(boundingBox.width, boundingBox.height, 10, false, false);

  if (!paths){ 
    console.error("Contradiction created");
    return false;
  }

  return paths;
}