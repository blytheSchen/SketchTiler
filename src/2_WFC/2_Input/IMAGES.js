import MAP1 from "./MAP1.js";
import MAP2 from "./MAP2.js";
import MAP3 from "./MAP3.js";
import MAP4 from "./MAP4.js";
import HOUSES from "./HOUSES.js";
import FORESTS from "./FORESTS.js";

/** @type {{ GROUND: TilemapImage[], STRUCTURES: TilemapImage[], HOUSES: TilemapImage[], FORESTS: TilemapImage[] }} */
const IMAGES = {
  GROUND: [
    MAP1.GROUND,
    MAP2.GROUND,
    MAP3.GROUND,
    //MAP4.GROUND
  ],
  STRUCTURES: [
    MAP1.STRUCTURES,
    MAP2.STRUCTURES,
    MAP3.STRUCTURES,
    //MAP4.STRUCTURES
  ],
  HOUSES: HOUSES,
  FORESTS: [
    ...MAP1.FORESTS,
    FORESTS
  ]
};
export default IMAGES;