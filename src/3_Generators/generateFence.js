import WFCModel from "../2_WFC/1_Model/wfcModel.js";
import IMAGES from "../2_WFC/2_Input/images.js";
import TILEMAP from "../4_Phaser/TILEMAP.js";

const model = new WFCModel().learn(IMAGES.FENCES, 2);

/**
 * @param {BoundingBox} boundingBox
 * @returns {TilemapImage}
 */
export default function generateFence(boundingBox) {
  model.clearSetTiles();

  // generate fence
  const fence = model.generate(boundingBox.width, boundingBox.height, 10, false, false);

  if (!fence){ 
    console.error("Contradiction created");
    return false;
  }

  return fence;
}