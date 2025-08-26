import WFCModel from "../2_WFC/1_Model/WFCModel.js";
import IMAGES from "../2_WFC/2_Input/IMAGES.js";
import TILEMAP from "../4_Phaser/TILEMAP.js";

const model = new WFCModel().learn(IMAGES.FORESTS, 2);
console.log(model)

/**
 * @param {BoundingBox} boundingBox
 * @returns {TilemapImage}
 */
export default function generateForest(boundingBox) {
  model.clearSetTiles();

  // make a void border around the bounding box
  // this will ensure our generated forest is contained within the bounding box
  for(let i = 0; i < boundingBox.width + 2; i++){
    model.setTile(i, 0, TILEMAP.VOID);                        // top border
    model.setTile(i, boundingBox.height + 1, TILEMAP.VOID);   // bottom border
  }

  for(let i = 0; i < boundingBox.height + 2; i++){
    model.setTile(0, i, TILEMAP.VOID);                        // left border
    model.setTile(boundingBox.width + 1, i, TILEMAP.VOID);    // right border
  }

  const forest = model.generate(boundingBox.width + 2, boundingBox.height + 2, 10, false, false);
  
  if (!forest){ 
    console.error("Contradiction created");
    return false;
  }

  // trim void border
  forest.pop();     // removes bottom border
  forest.shift();   // removes top border
  for(let row of forest){
    row.pop();      // removes right border
    row.shift();    // removes left border
  }

  return forest;
}