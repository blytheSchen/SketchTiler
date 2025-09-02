import WFCModel from "../2_WFC/1_Model/WFCModel.js";
import IMAGES from "../2_WFC/2_Input/IMAGES.js";

const model = new WFCModel().learn(IMAGES.FORESTS, 2);

/**
 * @param {BoundingBox} boundingBox
 * @returns {TilemapImage}
 */
export default function generateForest(boundingBox) {
  model.clearSetTiles();
  const forest = model.generate(boundingBox.width, boundingBox.height, 10, false, false);
  if (!forest){ 
    console.error("Contradiction created");
    return false;
  }
  return forest;
}