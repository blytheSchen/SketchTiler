import WFCModel from "../2_WFC/1_Model/wfcModel.js";
import IMAGES from "../2_WFC/2_Input/images.js";
import TILEMAP from "../4_Phaser/3_Utils/tilemap.js";

const model = new WFCModel().learn(IMAGES.FENCES, 2);
const tinytown = TILEMAP["tiny_town"];

/**
 * @param {BoundingBox} boundingBox
 * @returns {TilemapImage}
 */
export default function generateFence(boundingBox) {
  model.clearSetTiles();

  const { width, height } = boundingBox;
  model.setTile(0, 0, tinytown.FENCE_TOP_LEFT);
  model.setTile(width-1, 0, tinytown.FENCE_TOP_RIGHT);
  model.setTile(0, height-1, tinytown.FENCE_BOTTOM_LEFT);
  model.setTile(width-1, height-1, tinytown.FENCE_BOTTOM_RIGHT);

  // generate fence
  const fence = model.generate(boundingBox.width, boundingBox.height, 10, false, false);

  if (!fence){ 
    console.error("Contradiction created");
    return false;
  }

  return fence;
}