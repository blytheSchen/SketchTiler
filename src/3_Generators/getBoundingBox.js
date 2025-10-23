import TILEMAP from "../4_Phaser/TILEMAP.js";

const tinytown = TILEMAP["tiny_town"];

/**
 * @param {Point[]} stroke
 * @returns {BoundingBox}
 */
export default function getBoundingBox(stroke) {
  let [minX, maxX, minY, maxY] = [Infinity, 0, Infinity, 0];

  for (const {x, y} of stroke) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  [minX, minY, maxX, maxY] = [minX, minY, maxX, maxY].map(canvasToTilemapCoords);

  return {
    topLeft: { x: minX, y: minY },
    bottomRight: { x: maxX, y: maxY },
    width: 1 + maxX - minX,
    height: 1 + maxY - minY
  };
}

/**
 * @param {number} coord 
 * @returns {number}
 */
function canvasToTilemapCoords(coord) {
  return Math.floor(coord / tinytown.TILE_WIDTH);
}