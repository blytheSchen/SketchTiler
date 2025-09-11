const TILEMAP = {
  "tiny_town": {
    WIDTH: 40,      // in tiles
    HEIGHT: 25,     // in tiles
    TILE_WIDTH: 16, // in pixels

    HOUSE_BOTTOM_LEFT_TILES: [73, 77],      // red, blue
    HOUSE_BOTTOM_RIGHT_TILES: [76, 80],     // red, blue
    HOUSE_TOP_LEFT_TILES: [49, 53],         // blue, red
    HOUSE_TOP_RIGHT_TILES: [51, 55],        // blue, red
    HOUSE_DOOR_TILES: [86, 90],             // red, blue
    HOUSE_DOUBLE_DOOR_LEFT_TILES: [87, 91], // red, blue
    HOUSE_DOUBLE_DOOR_RIGHT_TILES: [88, 92], // red, blue
    VOID: [-1],
    FENCE_TOP_LEFT: [45],
    FENCE_TOP_RIGHT: [47],
    FENCE_BOTTOM_LEFT: [69],
    FENCE_BOTTOM_RIGHT: [71],
  },
  "color_tiles": {
    house: {
      TOP_LEFT: [6],
      TOP_RIGHT: [11],
      BOTTOM_LEFT: [21],
      BOTTOM_RIGHT: [16],

      TOP: [26],
      BOTTOM: [36],
      LEFT: [41],
      RIGHT: [31],

      FILL: [1]
    },

    forest: {
      TOP_LEFT: [7],
      TOP_RIGHT: [12],
      BOTTOM_LEFT: [22],
      BOTTOM_RIGHT: [17],

      TOP: [27],
      BOTTOM: [37],
      LEFT: [42],
      RIGHT: [32],

      FILL: [2]
    }
  }
};
export default TILEMAP;