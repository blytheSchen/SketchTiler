import WFCModel from "../2_WFC/1_Model/wfcModel.js";
import IMAGES from "../2_WFC/2_Input/images.js";
import TILEMAP from "../4_Phaser/3_Utils/tilemap.js";

const tinytown = TILEMAP["tiny_town"];

/**
 * @param {BoundingBox} boundingBox
 * @returns {TilemapImage}
 */
export default function generatePaths(structsLayer) {
  const model = new WFCModel().learn(IMAGES.PATHS, 2);
  model.clearSetTiles();

  // place path tiles at all doors
  let doorLocations = findDoors(structsLayer);
  for(let door of doorLocations){
    if(door.y + 1 < tinytown.HEIGHT){
      model.setTile(door.x, door.y + 1, tinytown.PATH);
    }
  }

  // generate paths
  const paths = model.generate(tinytown.WIDTH, tinytown.HEIGHT, 10, false, false);
  //console.log(paths)

  if (!paths){ 
    console.error("Contradiction created");
    return false;
  }

  return paths;
}

function findDoors(layer) {
  let result = [];

  // scan layer for doors
  for(let y = 0; y < layer.length; y++){
    for(let x = 0; x < layer[y].length; x++){
      if(isDoor(layer[y][x])){ result.push({x, y}); }
    }
  }

  return result;
}

function isDoor(id){
  if( tinytown.HOUSE_DOOR_TILES.includes(id) || 
      tinytown.HOUSE_DOUBLE_DOOR_LEFT_TILES.includes(id) || 
      tinytown.HOUSE_DOUBLE_DOOR_RIGHT_TILES.includes(id)  
  ){ return true; }

  return false;
}